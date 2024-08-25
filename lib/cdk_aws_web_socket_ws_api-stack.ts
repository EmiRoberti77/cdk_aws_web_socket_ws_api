import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { WebSocketApi, WebSocketStage } from "aws-cdk-lib/aws-apigatewayv2";
import {
  lambdaHandler,
  dynamoTables,
  wsApi as ws,
  wsApiSsmValues,
} from "../src/util";
import * as dotenv from "dotenv";
dotenv.config();
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import path = require("path");
import { existsSync } from "fs";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ssm from "aws-cdk-lib/aws-ssm";

const WSS = "wss://";
const HTTPS = "https://";

export class CdkAwsWebSocketWsApiStack extends cdk.Stack {
  private connectHandler: NodejsFunction;
  private disconnectHandler: NodejsFunction;
  private messageHandler: NodejsFunction;
  private sendBroadcastHandler: NodejsFunction;
  private wsapi: WebSocketApi;
  handler = "handler";
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const connectHandlerPath = path.join(
      __dirname,
      "..",
      "src",
      "lambdas",
      "lambdaConnect",
      "handler.ts"
    );
    if (!existsSync(connectHandlerPath)) {
      this.error(connectHandlerPath);
      return;
    }

    const disconnectHandlerPath = path.join(
      __dirname,
      "..",
      "src",
      "lambdas",
      "lambdaDisconnect",
      "handler.ts"
    );

    const messageHandlerPath = path.join(
      __dirname,
      "..",
      "src",
      "lambdas",
      "lambdaMessageHandler",
      "handler.ts"
    );

    const sendBroadcastHandlerPath = path.join(
      __dirname,
      "..",
      "src",
      "lambdas",
      "lambdaSendBroadcastHandler",
      "handler.ts"
    );

    if (
      !this.validateAllLambdasPath([
        connectHandlerPath,
        disconnectHandlerPath,
        messageHandlerPath,
        sendBroadcastHandlerPath,
      ])
    )
      return;

    this.wsapi = new WebSocketApi(this, ws.wsApiName, {
      routeSelectionExpression: "$request.body.action",
    });

    this.connectHandler = this.createLambdaWithRole(
      lambdaHandler.connectHandler,
      connectHandlerPath,
      this.handler,
      `${ws.wsApiName}-connectHandlerRole`
    );

    this.disconnectHandler = this.createLambdaWithRole(
      lambdaHandler.disconnectHandler,
      disconnectHandlerPath,
      this.handler,
      `${ws.wsApiName}-disconnectHandlerRole`
    );

    this.messageHandler = this.createLambdaWithRole(
      lambdaHandler.messageHandler,
      messageHandlerPath,
      this.handler,
      `${ws.wsApiName}-messageHandlerRole`
    );

    this.sendBroadcastHandler = this.createLambdaWithRole(
      lambdaHandler.broadcastHandler,
      sendBroadcastHandlerPath,
      this.handler,
      `${ws.wsApiName}-sendBroadcastHandlerRole`
    );

    this.wsapi.addRoute("$connect", {
      integration: new WebSocketLambdaIntegration(
        "connectIntegration",
        this.connectHandler
      ),
    });

    this.wsapi.addRoute("$disconnect", {
      integration: new WebSocketLambdaIntegration(
        "disconnectIntegration",
        this.disconnectHandler
      ),
    });

    this.wsapi.addRoute("customMessageRoute", {
      integration: new WebSocketLambdaIntegration(
        "messageIntegration",
        this.messageHandler
      ),
    });

    const stageName = process.env.STAGE || "production";
    const wsApiStage = new WebSocketStage(this, `${ws.wsApiName}Stage`, {
      webSocketApi: this.wsapi,
      stageName,
      autoDeploy: true,
    });

    const httpsUrl = this.extractHttpsUrlFromWss(wsApiStage.url);
    this.storeApiHttpUrl(httpsUrl);

    new cdk.CfnOutput(this, "wssUrl", {
      value: wsApiStage.url,
    });
    new cdk.CfnOutput(this, "httpsUrl", {
      value: httpsUrl,
    });
    new cdk.CfnOutput(this, "env", {
      value:
        process.env.STAGE ||
        "WARNING:stage env not found, ( default to production)",
    });
  }

  private validateAllLambdasPath(paths: string[]): boolean {
    var ret = true;
    paths.forEach((path) => {
      if (!existsSync(path)) {
        this.error(path);
        ret = false;
      }
    });
    return ret;
  }

  private error(msg: string) {
    console.error(`Error:${msg}`);
  }

  private createLambda(
    functionName: string,
    entry: string,
    handler: string
  ): NodejsFunction {
    const lambda = new NodejsFunction(this, functionName, {
      functionName,
      entry,
      handler,
      runtime: Runtime.NODEJS_20_X,
    });

    return lambda;
  }

  private createLambdaWithRole(
    functionName: string,
    entry: string,
    handler: string,
    roleName: string
  ): NodejsFunction {
    const role = new Role(this, roleName, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });

    // Attach the managed policy for API Gateway Invoke permissions
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayInvokeFullAccess")
    );

    // Add specific CloudWatch Logs policy to the role
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${functionName}:*`,
        ],
      })
    );

    // Add specific policy for managing WebSocket connections
    role.addToPolicy(
      new PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${
            this.wsapi.apiId
          }/${process.env.STAGE || "production"}/@connections/*`,
        ],
        effect: Effect.ALLOW,
      })
    );

    return new NodejsFunction(this, functionName, {
      functionName,
      entry,
      handler,
      runtime: Runtime.NODEJS_20_X,
      role: role,
    });
  }

  private extractHttpsUrlFromWss(wssUrl: string): string {
    return wssUrl.replace(WSS, HTTPS);
  }

  private storeApiHttpUrl(httpsUrl: string) {
    new ssm.StringParameter(this, wsApiSsmValues.wsApiRumoHttpsUrl, {
      parameterName: wsApiSsmValues.wsApiRumoHttpsUrl,
      stringValue: httpsUrl,
      description: wsApiSsmValues.wsApiRumoDescription,
    });
  }
}
