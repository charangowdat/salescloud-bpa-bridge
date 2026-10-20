@path: '/bridge'
service BridgeService {
    action receiveOpportunityEvent(
        id              : String,
        specversion     : String,
        type            : String,
        source          : String,
        subject         : String,
        time            : String,
        datacontenttype : String,
        data            : Map
    ) returns {
        accepted           : Boolean;
        message            : String;
        statusCode         : Integer;
        workflowInstanceId : String;
    };
}