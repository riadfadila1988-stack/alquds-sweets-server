Deployment to AWS Elastic Beanstalk

This document describes a minimal, repeatable way to deploy the `alquds-sweets-server` Node.js + TypeScript app to AWS Elastic Beanstalk.

Assumptions
- You have an AWS account and permissions to create EB applications and environments.
- You have the AWS CLI and EB CLI installed and configured with `aws configure`.
- MongoDB (or your DB) is accessible from the EB environment (Atlas or self-managed). Provide connection string in environment variables.

Why these files were added
- `Procfile` ensures EB runs `npm run start` (which will trigger `prestart` -> `npm run build`).
- `.ebextensions/01_env.config` sets `NPM_CONFIG_PRODUCTION=false` so devDependencies (TypeScript compiler) get installed during deploy.

Required environment variables
- MONGO_URI (or whatever your DB variable name is in `src/config/mongoose`)
- JWT_SECRET (or any other secrets your app uses)
- DISABLE_BG_JOBS (optional): set to `1` or `true` to prevent background jobs from starting in the EB web environment.

Quick deploy steps (EB CLI)
1. From the `alquds-sweets-server` directory:

   eb init -p "Node.js" alquds-sweets-server

   - Follow prompts to choose region and create an application. Choose the Node.js platform (e.g. Node.js 18+ on Amazon Linux 2).

2. Create an environment (single-instance or load-balanced):

   eb create alquds-sweets-server-env --instance_type t3.small

3. Set environment variables (one-liners or in console):

   eb setenv MONGO_URI="<your-mongo-uri>" JWT_SECRET="<your-jwt>" DISABLE_BG_JOBS=1

4. Deploy:

   eb deploy

Notes and recommendations
- The project uses TypeScript. The `prestart` script runs `npm run build` (which uses `npx tsc`). Because Elastic Beanstalk normally skips devDependencies, the `.ebextensions/01_env.config` sets `NPM_CONFIG_PRODUCTION=false` to ensure the TypeScript compiler and other devDependencies are installed so the build can run on the server.

- Alternative (recommended for production): Build artifacts locally (npm run build) and deploy a zip that includes `dist/` and `package.json` with a `start` script that directly runs `node dist/index.js`. This avoids installing devDependencies on EB instances.

- For background jobs consider using a separate EB worker environment or AWS Lambda/Step Functions. Running background jobs in a web environment can lead to duplicated work when scaling.

- Logs: To fetch EB logs use `eb logs`.

- If you prefer Docker, create a `Dockerfile` that builds the TypeScript and runs the compiled output, then configure EB to use Docker.

Troubleshooting
- If builds fail with "tsc: command not found", confirm `NPM_CONFIG_PRODUCTION=false` is set in EB environment and redeploy.
- Check `eb logs` for stack traces.

If you want, I can also:
- Add a Dockerfile for containerized deploy.
- Pre-build `dist/` and add a `.ebignore`/deployment zip recipe so devDependencies aren't required on EB.

CI/CD with GitHub Actions

This repository includes a sample GitHub Actions workflow at `.github/workflows/deploy-eb.yml` that:
- Installs dependencies and builds the TypeScript project (`npm ci` + `npm run build`).
- Packages the `dist/` folder, `package.json`, `Procfile`, and `.ebextensions` into a zip.
- Uploads the zip to an S3 bucket and creates a new application version in Elastic Beanstalk, then updates the specified EB environment.

Required GitHub repository secrets (set in Settings → Secrets → Actions):
- AWS_ACCESS_KEY_ID — IAM user's access key ID with permissions described below
- AWS_SECRET_ACCESS_KEY — IAM user's secret
- AWS_REGION — e.g. us-east-1
- EB_APPLICATION_NAME — Elastic Beanstalk Application name
- EB_ENVIRONMENT_NAME — Elastic Beanstalk Environment name
- EB_S3_BUCKET — S3 bucket used by the deploy action (create one per-region if needed)

Minimal IAM permissions for the deploy user
- elasticbeanstalk:CreateApplicationVersion
- elasticbeanstalk:UpdateEnvironment
- elasticbeanstalk:DescribeEnvironments
- s3:PutObject, s3:GetObject, s3:PutObjectAcl, s3:ListBucket
- iam:PassRole (if your EB environment uses EC2 instance profiles)

How the workflow works
1. Push to `main` triggers the workflow.
2. The action builds the TypeScript output locally on the runner and zips the runtime files.
3. The `einaregilsson/beanstalk-deploy` action uploads the zip to S3 and tells EB to deploy it.

Notes
- This approach builds the project in CI and deploys compiled `dist/` artifacts. It avoids installing devDependencies on EB instances and is the recommended production workflow.
- Make sure the `Procfile` and `package.json` `start` script run `node dist/index.js` (already true in this project).
- If you store secrets like the Mongo connection string in GitHub Secrets, set them as environment variables in EB using `eb setenv` or via the EB Console.
