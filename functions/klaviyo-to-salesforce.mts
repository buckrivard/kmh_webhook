import type { Config, Context } from "@netlify/functions";

async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!
  });

  const response = await fetch(
    `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    }
  );

  if (!response.ok) {
    console.error('error getting access token');
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    access_token: string;
  }>;
}

export default async (req: Request, context: Context) => {
  console.log('begin get access token');
  const { access_token } = await getAccessToken();

  // Replace the following object with your actual new account data
  const newAccountData = {
    LastName: 'Test',
  };

  const salesforceUrl = `${process.env.SF_LOGIN_URL}/services/data/v67.0/sobjects/Lead/`;

  const sfResponse = await fetch(salesforceUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(newAccountData)
  });

  if (!sfResponse.ok) {
    throw new Error(`Salesforce API error: ${await sfResponse.text()}`);
  }

  const result = await sfResponse.json();
  console.log(result);
  return new Response(JSON.stringify(result), { status: 200 });
}

export const config = {
  path: "/klaviyo-to-salesforce",
  method: 'GET',
} satisfies Config;