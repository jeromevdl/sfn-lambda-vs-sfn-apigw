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

import { Template } from '@aws-cdk/assertions';
import * as cdk from '@aws-cdk/core';
import * as SfnLambdaVsSfnApigw from '../lib/sfn-lambda-vs-sfn-apigw-stack';

test('Workflows created', () => {
    const app = new cdk.App();
    const stack = new SfnLambdaVsSfnApigw.SfnLambdaVsSfnApigwStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::StepFunctions::StateMachine', 2);

    template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Runtime: 'python3.9',
    });

    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);

    template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
        ApiId: {
            "Ref": "AddressHttpApi98565E7E"
        },
        IntegrationType: 'HTTP_PROXY',
        IntegrationUri: 'https://api-adresse.data.gouv.fr/search/',
    });

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
        ApiId: {
            "Ref": "AddressHttpApi98565E7E"
        },
        RouteKey: "GET /search", 
        Target: {
            "Fn::Join": [
              "",
              [
                "integrations/",
                {
                  "Ref": "AddressHttpApiGETsearchHttpIntegration57b8504521b53f12ea2c75fb6fc4b4b0F44F30A1"
                }
              ]
            ]
          }
    });
});
