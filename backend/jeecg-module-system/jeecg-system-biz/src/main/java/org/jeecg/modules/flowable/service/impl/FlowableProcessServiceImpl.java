package org.jeecg.modules.flowable.service.impl;

import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;
import org.jeecg.modules.flowable.service.IFlowableProcessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FlowableProcessServiceImpl implements IFlowableProcessService {

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private TaskService taskService;

    @Override
    public FlowableProcessStartResp startProcess(FlowableProcessStartReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessKey())) {
            throw new IllegalArgumentException("processKey is required");
        }
        String assignee = resolveAssignee(req.getAssignee(), username);
        Map<String, Object> variables = new HashMap<>();
        variables.put("assignee", assignee);
        ProcessInstance instance = runtimeService.startProcessInstanceByKey(
            req.getProcessKey(),
            req.getBusinessKey(),
            variables);
        FlowableProcessStartResp resp = new FlowableProcessStartResp();
        resp.setProcessInstanceId(instance.getProcessInstanceId());
        return resp;
    }

    @Override
    public List<FlowableTaskResp> queryTasks(FlowableTaskQueryReq req, String username) {
        String assignee = resolveAssignee(req == null ? null : req.getAssignee(), username);
        List<Task> tasks = taskService.createTaskQuery()
            .taskAssignee(assignee)
            .orderByTaskCreateTime()
            .desc()
            .list();
        List<FlowableTaskResp> respList = new ArrayList<>();
        for (Task task : tasks) {
            FlowableTaskResp resp = new FlowableTaskResp();
            resp.setTaskId(task.getId());
            resp.setName(task.getName());
            resp.setProcessInstanceId(task.getProcessInstanceId());
            resp.setCreateTime(task.getCreateTime());
            respList.add(resp);
        }
        return respList;
    }

    @Override
    public void completeTask(FlowableTaskCompleteReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getTaskId())) {
            throw new IllegalArgumentException("taskId is required");
        }
        Task task = taskService.createTaskQuery().taskId(req.getTaskId()).singleResult();
        if (task == null) {
            throw new IllegalStateException("task not found");
        }
        String expectedAssignee = oConvertUtils.isNotEmpty(req.getAssignee()) ? req.getAssignee() : username;
        if (oConvertUtils.isNotEmpty(expectedAssignee)
            && oConvertUtils.isNotEmpty(task.getAssignee())
            && !expectedAssignee.equals(task.getAssignee())) {
            throw new IllegalArgumentException("assignee mismatch");
        }
        taskService.complete(task.getId());
    }

    private String resolveAssignee(String assignee, String username) {
        if (oConvertUtils.isNotEmpty(assignee)) {
            return assignee;
        }
        if (oConvertUtils.isNotEmpty(username)) {
            return username;
        }
        return "admin";
    }
}
