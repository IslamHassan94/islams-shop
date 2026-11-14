/**
 * AWS credentials for the Data API / Secrets Manager clients.
 *
 * Preferred (production on Vercel): OIDC federation. Set APP_AWS_ROLE_ARN and Vercel exchanges
 * its short-lived OIDC token for temporary AWS credentials. No access keys are stored anywhere.
 * Fallback: static keys in APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEY.
 * Otherwise: the default AWS credential chain (e.g. your local `aws configure` profile).
 */
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

export const AWS_REGION = process.env.APP_AWS_REGION ?? "eu-central-1";

export function awsCredentials() {
  const roleArn = process.env.APP_AWS_ROLE_ARN;
  if (roleArn) return awsCredentialsProvider({ roleArn });
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) return { accessKeyId, secretAccessKey };
  return undefined;
}
