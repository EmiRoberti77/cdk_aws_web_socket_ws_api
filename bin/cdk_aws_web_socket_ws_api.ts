#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkAwsWebSocketWsApiStack } from "../lib/cdk_aws_web_socket_ws_api-stack";

const app = new cdk.App();
new CdkAwsWebSocketWsApiStack(app, "CdkAwsWebSocketWsApiRumoStack");
