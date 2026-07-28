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
    mobile: 'MobilePhone',
    street: 'Street',
    city: 'City',
    country: 'Country',
    state: 'State',
    zip: 'PostalCode',
    business_type: 'Business_Type_2__c',
    business_role: 'Business_Role__c',
    services: 'Wholesale_Services_Interested_In_2__c',
    referral_source: 'How_did_you_hear_about_us__c',
    goals: 'Long_Term_Goals__c',
    questions: 'Additional_Information__c',
    subscribe_to_newsletter: 'Receive_Newsletter_and_Notifications__c',
};
const klaviyoToSalesforceSchema = z.object({
    website: z.string().optional(),
    business_role: z.string().optional(),
    city: z.string(),
    company: z.string(),
    country: z.string(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    mobile: z.string().optional(),
    phone: z.string(),
    street: z.string(),
    state: z.string(),
    zip: z.string(),
    business_type: z.enum(['Spa/Salon/Studio', 'Wellness (i.e. acupuncture, aromatherapy, yoga)', 'Medical (i.e anti-aging, laser technology, plastic surgery)', 'Boutique/Retail', 'E-commerce/Online Store', 'Consulting/Formulating', 'Hotel/Amenity', 'Other']).optional(),
    services: z.string().prefault('').transform((value) => {
        if (value === '')
            return null;
        const values = [...value.matchAll(/'([^']*)'/g)].map(match => match[1]);
        return values.join(";");
    }),
    referral_source: z.enum(['Web Search', 'Social Media (Facebook, etc.)', 'Lipgloss + Aftershave', 'Skin Inc. Magazine', 'Referral', 'Trade Show/Event', 'Other']).optional(),
    goals: z.string().optional(),
    questions: z.string().optional(),
    subscribe_to_newsletter: z.string().optional(),
    social_media_link: z.string().optional(),
});
export default async (req, context) => {
    const klaviyoData = await req.json();
    console.log('unparsed', klaviyoData);
    const validatedKlaviyoData = klaviyoToSalesforceSchema.safeParse(klaviyoData);
    console.log('validated', validatedKlaviyoData);
    if (!validatedKlaviyoData.success) {
        console.error(validatedKlaviyoData.error);
        return new Response(JSON.stringify({ error: validatedKlaviyoData.error.message }), { status: 400 });
    }
    const salesforceData = Object.fromEntries(Object.entries(klaviyoToSalesforceMap).map(([key, value]) => {
        if (validatedKlaviyoData.data[key] === undefined) {
            return [value, null];
        }
        return [value, validatedKlaviyoData.data[key]];
    }).filter(([_, value]) => value !== null));
    console.log(salesforceData);
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
    console.log(result);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
export const config = {
    path: "/klaviyo-to-salesforce",
    method: 'POST',
};
