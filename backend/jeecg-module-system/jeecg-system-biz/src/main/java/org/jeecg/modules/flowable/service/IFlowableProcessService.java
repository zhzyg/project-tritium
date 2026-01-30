package org.jeecg.modules.flowable.service;

import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;

import java.util.List;

public interface IFlowableProcessService {
    FlowableProcessStartResp startProcess(FlowableProcessStartReq req, String username);

    List<FlowableTaskResp> queryTasks(FlowableTaskQueryReq req, String username);

    void completeTask(FlowableTaskCompleteReq req, String username);
}
