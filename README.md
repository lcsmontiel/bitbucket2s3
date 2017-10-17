Node v6.10.3 Lambda Function to integrate Bitbucket as S3 Bucket.

Activating S3 Bucket Versioning you can use it to triggering push event to AWS CodePipeline

## HOW TO

### Remove .example from example's filename below and set properly the parameters

```
./config/bitbucket.json.example
./config/s3.json.example
```
### Install packages

Run the following command with Node Version 6.10.3

```
npm install
```

### Zip project root without main-tree (only config, node_modules, index.js, etc...)

### Upload it to a Lambda Function with the following role

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "<YOUR BUCKET ARN HERE>"
        }
    ]
}
```

### Send "reponame","branch" and "owner" to event payload of Lambda Function

Let's do it!