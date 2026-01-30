package org.jeecg.modules.flowable.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.variable.api.history.HistoricVariableInstance;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;
import org.jeecg.modules.flowable.service.IFlowableProcessService;
import org.jeecg.modules.flowable.service.IFlowableVarMappingService;
import org.jeecg.modules.formengine.service.IFormSchemaPublishService;
import org.jeecg.modules.formmeta.dto.FormSchemaFieldMetaResp;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;
import org.jeecg.modules.formruntime.dto.FormRecordMutationReq;
import org.jeecg.modules.formruntime.dto.FormRecordPageResp;
import org.jeecg.modules.formruntime.entity.FormRecord;
import org.jeecg.modules.formruntime.service.IFormRecordMutationService;
import org.jeecg.modules.formruntime.service.IFormRecordQueryService;
import org.jeecg.modules.formruntime.service.IFormRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class FlowableProcessServiceImpl implements IFlowableProcessService {

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private HistoryService historyService;

    @Autowired
    private IFormSchemaPublishService formSchemaPublishService;

    @Autowired
    private IFormRecordQueryService formRecordQueryService;

    @Autowired
    private IFormRecordService formRecordService;

    @Autowired
    private IFormRecordMutationService formRecordMutationService;

    @Autowired
    private IFlowableVarMappingService flowableVarMappingService;

    @Override
    public FlowableProcessStartResp startProcess(FlowableProcessStartReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessKey())) {
            throw new IllegalArgumentException("processKey is required");
        }
        String assignee = resolveAssignee(req.getAssignee(), username);
        Map<String, Object> variables = new HashMap<>();
        variables.put("assignee", assignee);

        String formKey = req.getFormKey();
        String recordId = req.getRecordId();
        String businessKey = req.getBusinessKey();
        FormSchemaPublishedResp published = null;
        if (oConvertUtils.isNotEmpty(formKey)) {
            if (oConvertUtils.isEmpty(recordId)) {
                throw new IllegalArgumentException("recordId is required for form mapping");
            }
            published = formSchemaPublishService.getLatestPublished(formKey);
            if (published == null) {
                throw new IllegalStateException("published schema not found");
            }
            Map<String, Object> formData = fetchFormData(formKey, published, recordId);
            Map<String, Object> mappedVars = flowableVarMappingService.mapVariables(formKey, published, formData, null);
            variables.putAll(mappedVars);
            if (oConvertUtils.isEmpty(businessKey)) {
                businessKey = buildBusinessKey(formKey, recordId, published.getVersion());
            }
        }

        ProcessInstance instance;
        if (oConvertUtils.isNotEmpty(businessKey)) {
            instance = runtimeService.startProcessInstanceByKey(
                req.getProcessKey(),
                businessKey,
                variables);
        } else {
            instance = runtimeService.startProcessInstanceByKey(req.getProcessKey(), variables);
        }

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

        String processInstanceId = task.getProcessInstanceId();
        if (req.getPatchData() != null && !req.getPatchData().isEmpty()) {
            if (oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getRecordId())) {
                throw new IllegalArgumentException("formKey and recordId are required when patchData provided");
            }
            FormRecordMutationReq updateReq = new FormRecordMutationReq();
            updateReq.setFormKey(req.getFormKey());
            updateReq.setRecordId(req.getRecordId());
            updateReq.setData(req.getPatchData());
            formRecordMutationService.update(updateReq, username);

            FormSchemaPublishedResp published = formSchemaPublishService.getLatestPublished(req.getFormKey());
            if (published != null) {
                Map<String, Object> latestData = fetchFormData(req.getFormKey(), published, req.getRecordId());
                Set<String> patchKeys = req.getPatchData().keySet();
                Map<String, Object> patchVars = flowableVarMappingService.mapVariables(req.getFormKey(), published, latestData, patchKeys);
                if (oConvertUtils.isNotEmpty(processInstanceId) && patchVars != null && !patchVars.isEmpty()) {
                    runtimeService.setVariables(processInstanceId, patchVars);
                }
            }
        }

        taskService.complete(task.getId());
    }

    @Override
    public Map<String, Object> getProcessVariables(String processInstanceId) {
        Map<String, Object> variables = new HashMap<>();
        if (oConvertUtils.isEmpty(processInstanceId)) {
            return variables;
        }
        ProcessInstance instance = runtimeService.createProcessInstanceQuery()
            .processInstanceId(processInstanceId)
            .singleResult();
        if (instance != null) {
            variables.putAll(runtimeService.getVariables(processInstanceId));
            return variables;
        }
        List<HistoricVariableInstance> history = historyService.createHistoricVariableInstanceQuery()
            .processInstanceId(processInstanceId)
            .list();
        if (history != null) {
            for (HistoricVariableInstance item : history) {
                variables.put(item.getVariableName(), item.getValue());
            }
        }
        return variables;
    }

    private Map<String, Object> fetchFormData(String formKey, FormSchemaPublishedResp published, String recordId) {
        FormRecordPageResp physical = formRecordQueryService.queryPublishedRecord(formKey, published, recordId);
        if (physical != null && physical.getData() != null) {
            return physical.getData();
        }
        FormRecord record = formRecordService.getById(recordId);
        if (record == null) {
            throw new IllegalStateException("record not found");
        }
        if (!formKey.equals(record.getFormKey())) {
            throw new IllegalArgumentException("record does not belong to formKey");
        }
        log.warn("flowable vars fallback to data_json for record {}", recordId);
        return extractDataFromJson(record.getDataJson(), published);
    }

    private Map<String, Object> extractDataFromJson(String dataJson, FormSchemaPublishedResp published) {
        Map<String, Object> result = new HashMap<>();
        if (oConvertUtils.isEmpty(dataJson) || published == null || published.getFieldMetas() == null) {
            return result;
        }
        Map<String, Object> parsed;
        try {
            parsed = JSON.parseObject(dataJson, Map.class);
        } catch (Exception ex) {
            return result;
        }
        for (FormSchemaFieldMetaResp meta : published.getFieldMetas()) {
            if (meta == null || oConvertUtils.isEmpty(meta.getFieldKey())) {
                continue;
            }
            String key = meta.getFieldKey();
            if (parsed.containsKey(key)) {
                result.put(key, parsed.get(key));
            }
        }
        return result;
    }

    private String buildBusinessKey(String formKey, String recordId, Integer schemaVersion) {
        String version = schemaVersion == null ? "" : "v" + schemaVersion;
        return String.format("form:%s:record:%s:%s", formKey, recordId, version);
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
