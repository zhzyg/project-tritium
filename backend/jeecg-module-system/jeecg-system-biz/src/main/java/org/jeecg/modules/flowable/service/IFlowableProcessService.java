package org.jeecg.modules.flowable.service;

import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStartByFormReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartByFormResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStatusResp;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskClaimReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;
import org.jeecg.modules.flowable.dto.FlowableTaskContextResp;
import org.jeecg.modules.flowable.dto.FlowableProcessTraceResp;
import org.jeecg.modules.flowable.dto.FlowableHistoricTaskResp;

import java.util.List;
import java.util.Map;

public interface IFlowableProcessService {
    FlowableProcessStartResp startProcess(FlowableProcessStartReq req, String username);

    FlowableProcessStartByFormResp startProcessByForm(FlowableProcessStartByFormReq req, String username);

    List<FlowableTaskResp> queryTasks(FlowableTaskQueryReq req, String username);

    void completeTask(FlowableTaskCompleteReq req, String username);

    void claimTask(FlowableTaskClaimReq req, String username);

    List<org.jeecg.modules.flowable.dto.FlowableTaskCommentResp> getTaskComments(String taskId);

    FlowableProcessStatusResp getProcessStatus(String processInstanceId);

    Map<String, Object> getProcessVariables(String processInstanceId, String formKey);

    FlowableTaskContextResp getTaskContext(String taskId);

    List<FlowableProcessTraceResp> getProcessTrace(String processInstanceId);

    List<FlowableHistoricTaskResp> queryDoneTasks(FlowableTaskQueryReq req, String username);
}
