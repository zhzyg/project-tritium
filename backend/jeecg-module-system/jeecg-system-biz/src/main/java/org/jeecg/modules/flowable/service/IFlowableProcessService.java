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
import org.jeecg.modules.flowable.dto.FlowableHistoricProcessInstanceResp;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldPermReq;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldPermResp;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldRuleReq;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldRuleResp;

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

    FlowableTaskContextResp getProcessContext(String processInstanceId);

    FlowableTaskFieldPermResp getTaskFieldPerm(String procDefKey, String taskDefKey, String formKey);

    void upsertTaskFieldPerm(FlowableTaskFieldPermReq req, String username);

    FlowableTaskFieldRuleResp getTaskFieldRuleByTask(String taskId);

    List<FlowableTaskFieldRuleResp> listTaskFieldRuleByProc(String procDefKey);

    void upsertTaskFieldRule(FlowableTaskFieldRuleReq req, String username);

    List<FlowableProcessTraceResp> getProcessTrace(String processInstanceId);

    List<FlowableHistoricTaskResp> queryDoneTasks(FlowableTaskQueryReq req, String username);

    List<FlowableHistoricProcessInstanceResp> queryMyStartedProcesses(FlowableTaskQueryReq req, String username);
}
