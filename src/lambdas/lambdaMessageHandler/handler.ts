import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResult,
} from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { wsApiSsmValues } from "../../util";
const ERROR = "Error:httpsUrl is undefined";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResult> => {
  const endpoint = await getHttps();
  if (!endpoint) {
    console.error(ERROR);
    throw new Error(ERROR);
  }
  const client = new ApiGatewayManagementApiClient({
    endpoint,
  });

  console.log(event);
  const connectionId = event.requestContext.connectionId;
  const responseMessage = JSON.stringify({
    message: event.body,
    connectedAt: event.requestContext.connectedAt,
  });

  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(responseMessage),
    });

    await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "connected",
        connectionId,
      }),
    };
  } catch (error: any) {
    console.error("Error posting to connection:", error);
    return { statusCode: 500, body: error.message };
  }
};

const getHttps = async (): Promise<string | undefined> => {
  const ssmClient = new SSMClient({ region: "us-east-1" });
  const getParamsCommand = new GetParameterCommand({
    Name: wsApiSsmValues.wsApiRumoHttpsUrl,
    //WithDecryption: true,
  });
  const res = await ssmClient.send(getParamsCommand);
  return res.Parameter?.Value;
};
