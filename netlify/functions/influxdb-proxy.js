const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const token = "YSuHqMz2o57LX3IBvQqY3NM89_z9p15dQqKb9My-3cP_foL8V9_NLEcMX_zOjaJDaWhrmnGtoyK1fb2wLuWhGUQ==";
    const bucket = "iotbucket_cloud_stream";
    const org = "iothot_cloud";
    const influxUrl = "https://europe-west1-1.gcp.cloud2.influxdata.com/api/v2/write?bucket=" + bucket + "&org=" + org + "&precision=s";

    const data = event.body;

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
            "Authorization": "Token " + token
        },
        body: data
    };

    try {
        const response = await fetch(influxUrl, requestOptions);
        return {
            statusCode: response.status,
            body: JSON.stringify({ message: "Data sent successfully" })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An error occurred" })
        };
    }
};
