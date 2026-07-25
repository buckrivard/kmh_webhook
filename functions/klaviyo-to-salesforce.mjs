import { z } from "zod";
async function getAccessToken() {
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET
    });
    const response = await fetch(`${process.env.SF_LOGIN_URL}/services/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });
    if (!response.ok) {
        console.error('error getting access token');
        throw new Error(await response.text());
    }
    return response.json();
}
const klaviyoToSalesforceMap = {
    first_name: 'FirstName',
    last_name: 'LastName',
    email: 'email',
    company: 'Company',
    website: 'Website',
    social_media_link: 'Social_Media_Link__c',
    phone: 'Phone',
    mobile: 'Mobile',
    street: 'Street',
    city: 'City',
    country: 'Country',
    state: 'State',
    zip: 'PostalCode',
    business_type: 'Business_Type_2__c',
    // industry_other: '00Nf2000003HDQ5',
    business_role: 'Business_Role__c',
    // business_role_other: '00Nf2000003HDPv',
    services: 'Wholsesale_Services_Interested_In__c',
    // services_other: '00Nf2000003HDQF',
    referral_source: 'How_did_you_hear_about_us__c',
    // referral_source_other: '00Nf200000CgvyL',
    goals: 'Long_Term_Goals__c',
    questions: 'Additional_Information__c',
    subscribe_to_newsletter: 'Receive_Newsletter_and_Notifications__c',
};
const klaviyoToSalesforceSchema = z.object({
    website: z.string(),
    business_role: z.string(),
    // business_role_other: z.string(),
    city: z.string(),
    company: z.string(),
    country: z.string(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    mobile: z.string(),
    phone: z.string(),
    street: z.string(),
    state: z.string(),
    zip: z.string(),
    business_type: z.string(),
    // industry_other: z.string(),
    services: z.string(),
    // services_other: z.string(),
    referral_source: z.string(),
    // referral_source_other: z.string(),
    goals: z.string(),
    questions: z.string(),
    subscribe_to_newsletter: z.string(),
    social_media_link: z.string(),
});
export default async (req, context) => {
    const klaviyoData = await req.json();
    const validatedKlaviyoData = klaviyoToSalesforceSchema.safeParse(klaviyoData);
    if (!validatedKlaviyoData.success) {
        console.error(validatedKlaviyoData.error);
        return new Response(JSON.stringify({ error: validatedKlaviyoData.error.message }), { status: 400 });
    }
    console.log(validatedKlaviyoData.data);
    const salesforceData = Object.fromEntries(Object.entries(klaviyoToSalesforceMap).map(([key, value]) => [value, validatedKlaviyoData.data[key]]));
    console.log('post-transformed data', salesforceData);
    const { access_token } = await getAccessToken();
    const salesforceUrl = `${process.env.SF_LOGIN_URL}/services/data/v67.0/sobjects/Lead/`;
    const sfResponse = await fetch(salesforceUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(salesforceData)
    });
    if (!sfResponse.ok) {
        throw new Error(`Salesforce API error: ${await sfResponse.text()}`);
    }
    const result = await sfResponse.json();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
export const config = {
    path: "/klaviyo-to-salesforce",
    method: 'POST',
};
