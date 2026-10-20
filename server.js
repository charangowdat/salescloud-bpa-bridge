
import cds from '@sap/cds';
import express from 'express';

cds.on('bootstrap', (app) => {
  // Temporary diagnostic endpoint: capture the raw JSON body
  app.post(
    '/debug/salescloud-event',
    express.json({ limit: '1mb' }),
    (req, res) => {
      console.log(
        'RAW SALESCLOUD EVENT:',
        JSON.stringify(req.body, null, 2)
      );

      res.status(200).json({ received: true });
    }
  );
});

export default cds.server;
