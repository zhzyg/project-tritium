package org.jeecg.modules.flowable.service;

import org.jeecg.modules.flowable.dto.FlowableFormBindReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefRegReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefResp;

import java.util.List;

public interface IProcessRegistryService {
    List<FlowableProcessDefResp> listDefs();

    void registerDef(FlowableProcessDefRegReq req, String username);

    void setDefaultBinding(FlowableFormBindReq req, String username);

    String resolveDefaultProcessKey(String formKey);
}
