
import cds from '@sap/cds';

export default class BridgeService extends cds.ApplicationService {
  init() {
    this.on('receiveOpportunityEvent', async (req) => {
      console.log("Data from sales cloud: ", req.data);
      const {
        opportunityId,
        opportunityName,
        accountName
      } = req.data;

      // 1. Validate incoming opportunity data
      if (!opportunityId || !opportunityName || !accountName) {
        return req.reject(
          400,
          'opportunityId, opportunityName, and accountName are required'
        );
      }

      // 2. Read BPA configuration
      const {
        BPA_API_URL,
        BPA_TOKEN_URL,
        BPA_CLIENT_ID,
        BPA_CLIENT_SECRET,
        BPA_API_KEY,
        BPA_DEFINITION_ID
      } = process.env;

      if (
        !BPA_API_URL ||
        !BPA_TOKEN_URL ||
        !BPA_CLIENT_ID ||
        !BPA_CLIENT_SECRET ||
        !BPA_DEFINITION_ID
      ) {
        return req.reject(500, 'BPA configuration is incomplete');
      }

      try {
        // 3. Obtain OAuth access token
        const credentials = Buffer.from(
          `${BPA_CLIENT_ID}:${BPA_CLIENT_SECRET}`
        ).toString('base64');

        const tokenResponse = await fetch(BPA_TOKEN_URL, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
          console.error(
            'BPA token request failed:',
            tokenResponse.status,
            await tokenResponse.text()
          );

          return req.reject(502, 'Could not authenticate with BPA');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          return req.reject(502, 'BPA did not return an access token');
        }

        // 4. Build the payload expected by your BPA workflow
        const payload = {
          definitionId: BPA_DEFINITION_ID,
          context: {
            opportunityId,
            opportunityName,
            accountName
          }
        };

        // 5. Invoke the deployed BPA API trigger
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        };

        // SAP documents this header for API-trigger requests.
        if (BPA_API_KEY) {
          headers['api-key'] = BPA_API_KEY;
        }

        const bpaResponse = await fetch(BPA_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const responseText = await bpaResponse.text();

        if (!bpaResponse.ok) {
          console.error(
            'BPA trigger failed:',
            bpaResponse.status,
            responseText
          );

          return req.reject(
            502,
            `BPA trigger failed with HTTP ${bpaResponse.status}`
          );
        }

        let bpaResult;
        try {
          bpaResult = JSON.parse(responseText);
        } catch {
          bpaResult = { response: responseText };
        }

        console.log('BPA workflow triggered:', {
          opportunityId,
          status: bpaResponse.status
        });

        // 6. Return the BPA result to the caller
        return {
          accepted: true,
          message: 'BPA workflow triggered successfully',
          statusCode: bpaResponse.status,
          workflowInstanceId:
            bpaResult.id || bpaResult.workflowInstanceId || ''
        };
      } catch (error) {
        console.error('Opportunity-to-BPA integration failed:', error.message);

        return req.reject(502, 'Failed to communicate with BPA');
      }
    });

    return super.init();
  }
};
