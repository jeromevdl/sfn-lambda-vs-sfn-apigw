// Copyright 2021 Jerome Van Der Linden

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction, 
// including without limitation the rights to use, copy, modify, merge, publish, distribute, 
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import * as apigwv2 from '@aws-cdk/aws-apigatewayv2';
import { HttpProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as logs from '@aws-cdk/aws-logs';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { Choice, Condition, Fail, Pass, TaskInput } from '@aws-cdk/aws-stepfunctions';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';
import { CallApiGatewayHttpApiEndpointProps, HttpMethod } from '@aws-cdk/aws-stepfunctions-tasks';
import { Stack } from '@aws-cdk/core';
import * as cdk from '@aws-cdk/core';

export class SfnLambdaVsSfnApigwStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.lambdaWorkflow();

    this.apigwWorkflow();
  }

  private lambdaWorkflow() {
    const validateAddressLambda = new PythonFunction(this, 'validateAddressFunction', {
      entry: 'verifyAddress/src',
      description: 'Function that validates a postal address',
      runtime: lambda.Runtime.PYTHON_3_9,
      environment: {
        CONFIDENCE_THRESHOLD: '0.82',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      // architecture: lambda.Architecture.ARM_64,
    });

    const workflowwithLambdaLogs = new logs.LogGroup(this, 'workflowWithLambdaLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    new sfn.StateMachine(this, 'workflowWithLambda', {
      definition: new tasks.LambdaInvoke(this, 'Validate Address with Lambda', {
        lambdaFunction: validateAddressLambda,
        outputPath: '$.Payload',
      }),
      logs: {
        destination: workflowwithLambdaLogs,
        includeExecutionData: true,
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
    });
  }

  private apigwWorkflow() {
    const workflowwithLambdaLogs = new logs.LogGroup(this, 'workflowWithApiGwLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const addressIntegration = new HttpProxyIntegration({
      url: 'https://api-adresse.data.gouv.fr/search/',
    });

    const httpApi = new apigwv2.HttpApi(this, 'AddressHttpApi');

    httpApi.addRoutes({
      path: '/search',
      methods: [apigwv2.HttpMethod.GET],
      integration: addressIntegration,
    });

    const props: CallApiGatewayHttpApiEndpointProps = {
      apiId: httpApi.apiId,
      apiStack: Stack.of(httpApi),
      method: HttpMethod.GET,
      apiPath: '/search',
      queryParameters: TaskInput.fromObject({
        'q.$': 'States.Array($.road)',
        'postcode.$': 'States.Array($.postalcode)',
        autocomplete: ['0'],
        limit: ['1'],
      }),
      resultSelector: {
        'result.$': '$.ResponseBody.features',
      },
      resultPath: '$.addresscheck',
    };

    new sfn.StateMachine(this, 'workflowWithApiGw', {
      definition: new tasks.CallApiGatewayHttpApiEndpoint(this, 'Validate Address with API GW', props).next(
        new Choice(this, 'Is Address Valid')
          .when(
            Condition.and(
              Condition.isPresent('$.addresscheck.result[0]'),
              Condition.isPresent('$.addresscheck.result[0].properties'),
              Condition.isPresent('$.addresscheck.result[0].properties.score'),
              Condition.numberGreaterThan('$.addresscheck.result[0].properties.score', 0.82),
            ),
            new Pass(this, 'ReformatOutput', {
              parameters: {
                'road.$': '$.road',
                'city.$': '$.city',
                'postalcode.$': '$.postalcode',
                'address.$': '$.addresscheck.result[0].properties.label',
              },
            }),
          )
          .otherwise(new Fail(this, 'Address is incorrect')),
      ),
      logs: {
        destination: workflowwithLambdaLogs,
        includeExecutionData: true,
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
    });
  }
}
