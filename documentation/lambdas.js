// connect lambda
export const handler = async (event, context) => {
  console.log(event);
  console.log('*****');
  console.log(context);
  const response = {
    statusCode: 200,
  };
  return response;
};

// disconnect lambda
export const handler = async (event, context) => {
  console.log(event);
  console.log('*****');
  console.log(context);
  const response = {
    statusCode: 200,
  };
  return response;
};

// send message lambda
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

const client = new ApiGatewayManagementApiClient({
  endpoint: 'https://u6jivqvh5j.execute-api.us-east-1.amazonaws.com/production',
});

export const handler = async (event) => {
  console.log(event);

  const connectionId = event.requestContext.connectionId;
  const responseMessage = 'responding...';

  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(responseMessage),
    });
    await client.send(command);

    return { statusCode: 200 };
  } catch (error) {
    console.error('Error posting to connection:', error);
    return { statusCode: 500, body: 'Failed to send message.' };
  }
};

// broadcast lambda
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

const client = new ApiGatewayManagementApiClient({
  endpoint: 'https://u6jivqvh5j.execute-api.us-east-1.amazonaws.com/production',
});

export const handler = async (event) => {
  const connectionId = event.connectionId;
  const message = event.message;

  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    });
    //sending command
    await client.send(command);

    return { statusCode: 200 };
  } catch (error) {
    console.error('Error posting to connection:', error);
    return { statusCode: 500, body: 'Failed to send message.' };
  }
};
