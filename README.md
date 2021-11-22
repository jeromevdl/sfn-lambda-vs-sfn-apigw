# Step Functions with API Gateway integration or Lambda integration

This repository contains the source code for the blog post: [Step Functions with API Gateway integration, good idea?](https://jeromevdl.medium.com/8cbe9fff63ef)

It is based on AWS CDK (Cloud Development Kit), provides one stack with 2 state machines:
- one with API Gateway direct integration
- one more common with Lambda

For more information, read the blog post.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
