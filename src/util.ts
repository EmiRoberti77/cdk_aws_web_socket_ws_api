import { APIGatewayProxyResult } from "aws-lambda";
export enum HTTP_CODE {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  ERROR = 500,
}

export enum HTTP_METHOD {
  GET = "GET",
  POST = "POST",
}

export function addCorsHeader(arg: APIGatewayProxyResult) {
  if (!arg.headers) {
    arg.headers = {};
  }
  arg.headers["Access-Control-Allow-Origin"] = "*";
  arg.headers["Access-Control-Allow-Methods"] = "*";
}

export const jsonApiProxyResultResponse = (
  statusCode: HTTP_CODE,
  object: any
): APIGatewayProxyResult => {
  const response = {
    statusCode,
    body: JSON.stringify(object),
  };
  addCorsHeader(response);
  return response;
};

export enum dynamoTables {
  connectionIdRumoClients = "connectionIdRumoClients",
}

export enum wsApi {
  wsApiName = "wsRumoApi",
}

export enum wsApiSsmValues {
  wsApiRumoHttpsUrl = "wsApiRumoHttpsUrl",
  wsApiRumoDescription = "https url to connect lambdas",
}

export enum lambdaHandler {
  connectHandler = "wsConnectHandlerRumo",
  disconnectHandler = "wsDisconnectHandlerRumo",
  messageHandler = "wsMessageHandlerRumo",
  broadcastHandler = "wsBroadcastHandlerRumo",
}
