@path: '/bridge'
service BridgeService {
    action receiveOpportunityEvent(
        opportunityId : String,
        opportunityName : String,
        accountName : String
    ) returns {
        accepted : Boolean;
        message : String;
    };
}