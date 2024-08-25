import { APIGatewayProxyHandlerV2, APIGatewayProxyResult } from "aws-lambda";
export const handler = async (
  event: APIGatewayProxyHandlerV2
): Promise<APIGatewayProxyResult> => {
  console.log(event);
  return {
    statusCode: 200,
    body: "Message Recieved",
  };
};
