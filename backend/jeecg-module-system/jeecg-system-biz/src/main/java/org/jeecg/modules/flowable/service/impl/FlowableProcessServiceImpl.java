package org.jeecg.modules.flowable.service.impl;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.identitylink.api.IdentityLink;
import org.flowable.variable.api.history.HistoricVariableInstance;
import org.flowable.engine.history.HistoricProcessInstance;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStartByFormReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartByFormResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStatusResp;
import org.jeecg.modules.flowable.dto.FlowableTaskClaimReq;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;
import org.jeecg.modules.flowable.dto.FlowableTaskContextResp;
import org.jeecg.modules.flowable.service.IProcessRegistryService;
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
import org.jeecg.modules.system.service.ISysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class FlowableProcessServiceImpl implements IFlowableProcessService {

    private static final String PROCESS_APPROVAL_V1 = "TRITIUM_APPROVAL_V1";

    private final JdbcTemplate jdbcTemplate;

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

    @Autowired
    private ISysUserService sysUserService;

    @Autowired
    private IProcessRegistryService processRegistryService;

    @Autowired
    public FlowableProcessServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FlowableProcessStartResp startProcess(FlowableProcessStartReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessKey())) {
            throw new IllegalArgumentException("processKey is required");
        }
        String assignee = resolveAssignee(req.getAssignee(), username);
        String initiator = oConvertUtils.isNotEmpty(username) ? username : assignee;
        Map<String, Object> variables = new HashMap<>();
        variables.put("assignee", assignee);
        variables.put("initiator", initiator);

        String formKey = req.getFormKey();
        String recordId = req.getRecordId();
        String businessKey = req.getBusinessKey();
        FormSchemaPublishedResp published = null;
        if (PROCESS_APPROVAL_V1.equals(req.getProcessKey()) && oConvertUtils.isEmpty(formKey)) {
            throw new IllegalArgumentException("formKey is required for TRITIUM_APPROVAL_V1");
        }
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
            if (PROCESS_APPROVAL_V1.equals(req.getProcessKey())) {
                ensureAmountVariable(variables, formData);
            }
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

        if (oConvertUtils.isNotEmpty(formKey) && oConvertUtils.isNotEmpty(recordId) && published != null) {
            insertProcessLink(instance.getProcessInstanceId(),
                req.getProcessKey(),
                instance.getBusinessKey(),
                formKey,
                recordId,
                published.getVersion(),
                username);
        }

        FlowableProcessStartResp resp = new FlowableProcessStartResp();
        resp.setProcessInstanceId(instance.getProcessInstanceId());
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FlowableProcessStartByFormResp startProcessByForm(FlowableProcessStartByFormReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getRecordId())) {
            throw new IllegalArgumentException("formKey and recordId are required");
        }
        String processKey = processRegistryService.resolveDefaultProcessKey(req.getFormKey());
        if (oConvertUtils.isEmpty(processKey)) {
            throw new IllegalStateException("no default process binding");
        }
        FormSchemaPublishedResp published = formSchemaPublishService.getLatestPublished(req.getFormKey());
        if (published == null) {
            throw new IllegalStateException("published schema not found");
        }
        Map<String, Object> formData = fetchFormData(req.getFormKey(), published, req.getRecordId());
        Map<String, Object> mappedVars = flowableVarMappingService.mapVariables(req.getFormKey(), published, formData, null);
        String assignee = resolveAssignee(req.getAssignee(), username);
        String initiator = oConvertUtils.isNotEmpty(username) ? username : assignee;
        Map<String, Object> variables = new HashMap<>();
        variables.put("assignee", assignee);
        variables.put("initiator", initiator);
        variables.putAll(mappedVars);
        if (PROCESS_APPROVAL_V1.equals(processKey)) {
            ensureAmountVariable(variables, formData);
        }
        String businessKey = buildBusinessKey(req.getFormKey(), req.getRecordId(), published.getVersion());
        ProcessInstance instance = runtimeService.startProcessInstanceByKey(processKey, businessKey, variables);
        insertProcessLink(instance.getProcessInstanceId(),
            processKey,
            instance.getBusinessKey(),
            req.getFormKey(),
            req.getRecordId(),
            published.getVersion(),
            username);

        FlowableProcessStartByFormResp resp = new FlowableProcessStartByFormResp();
        resp.setProcessInstanceId(instance.getProcessInstanceId());
        resp.setProcessKey(processKey);
        resp.setBusinessKey(instance.getBusinessKey());
        return resp;
    }

    @Override
    public List<FlowableTaskResp> queryTasks(FlowableTaskQueryReq req, String username) {
        String currentUser = resolveCurrentUser(req == null ? null : req.getAssignee(), username);
        Map<String, FlowableTaskResp> merged = new LinkedHashMap<>();

        List<Task> assigneeTasks = taskService.createTaskQuery()
            .taskAssignee(currentUser)
            .orderByTaskCreateTime()
            .desc()
            .list();
        for (Task task : assigneeTasks) {
            merged.put(task.getId(), buildTaskResp(task));
        }

        Set<String> roleCodes = resolveRoleCodes(currentUser);
        if (!roleCodes.isEmpty()) {
            List<Task> candidateTasks = taskService.createTaskQuery()
                .taskCandidateGroupIn(new ArrayList<>(roleCodes))
                .taskUnassigned()
                .orderByTaskCreateTime()
                .desc()
                .list();
            for (Task task : candidateTasks) {
                merged.putIfAbsent(task.getId(), buildTaskResp(task));
            }
        }
        return new ArrayList<>(merged.values());
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
        String currentUser = oConvertUtils.isNotEmpty(username) ? username : req.getAssignee();
        if (oConvertUtils.isEmpty(currentUser)) {
            throw new IllegalArgumentException("assignee is required");
        }
        if (oConvertUtils.isEmpty(task.getAssignee())) {
            List<String> candidateGroups = getCandidateGroups(task.getId());
            if (!candidateGroups.isEmpty()) {
                throw new SecurityException("task must be claimed before completion");
            }
            throw new IllegalStateException("task has no assignee");
        }
        if (!currentUser.equals(task.getAssignee())) {
            throw new SecurityException("assignee mismatch");
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
    public void claimTask(FlowableTaskClaimReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getTaskId())) {
            throw new IllegalArgumentException("taskId is required");
        }
        String currentUser = resolveCurrentUser(req.getUserId(), username);
        if (oConvertUtils.isEmpty(currentUser)) {
            throw new IllegalArgumentException("userId is required");
        }
        Task task = taskService.createTaskQuery().taskId(req.getTaskId()).singleResult();
        if (task == null) {
            throw new IllegalStateException("task not found");
        }
        if (oConvertUtils.isNotEmpty(task.getAssignee())) {
            throw new IllegalStateException("task already claimed");
        }
        Set<String> roleCodes = resolveRoleCodes(currentUser);
        if (roleCodes.isEmpty()) {
            throw new SecurityException("forbidden");
        }
        Task candidateTask = taskService.createTaskQuery()
            .taskId(task.getId())
            .taskCandidateGroupIn(new ArrayList<>(roleCodes))
            .taskUnassigned()
            .singleResult();
        if (candidateTask == null) {
            throw new SecurityException("forbidden");
        }
        taskService.claim(task.getId(), currentUser);
    }

    @Override
    public FlowableProcessStatusResp getProcessStatus(String processInstanceId) {
        if (oConvertUtils.isEmpty(processInstanceId)) {
            throw new IllegalArgumentException("processInstanceId is required");
        }
        FlowableProcessStatusResp resp = new FlowableProcessStatusResp();
        ProcessInstance instance = runtimeService.createProcessInstanceQuery()
            .processInstanceId(processInstanceId)
            .singleResult();
        if (instance != null) {
            resp.setEnded(false);
            resp.setBusinessKey(instance.getBusinessKey());
            List<Task> tasks = taskService.createTaskQuery()
                .processInstanceId(processInstanceId)
                .orderByTaskCreateTime()
                .asc()
                .list();
            List<FlowableTaskResp> taskResps = new ArrayList<>();
            for (Task task : tasks) {
                taskResps.add(buildTaskResp(task));
            }
            resp.setCurrentTasks(taskResps);
            return resp;
        }
        resp.setEnded(true);
        HistoricProcessInstance historic = historyService.createHistoricProcessInstanceQuery()
            .processInstanceId(processInstanceId)
            .singleResult();
        if (historic != null) {
            resp.setBusinessKey(historic.getBusinessKey());
        }
        resp.setCurrentTasks(new ArrayList<>());
        return resp;
    }

    @Override
    public Map<String, Object> getProcessVariables(String processInstanceId, String formKey) {
        Map<String, Object> variables = new HashMap<>();
        if (oConvertUtils.isEmpty(processInstanceId)) {
            return variables;
        }
        ProcessInstance instance = runtimeService.createProcessInstanceQuery()
            .processInstanceId(processInstanceId)
            .singleResult();
        String businessKey = null;
        if (instance != null) {
            variables.putAll(runtimeService.getVariables(processInstanceId));
            businessKey = instance.getBusinessKey();
        } else {
            List<HistoricVariableInstance> history = historyService.createHistoricVariableInstanceQuery()
                .processInstanceId(processInstanceId)
                .list();
            if (history != null) {
                for (HistoricVariableInstance item : history) {
                    variables.put(item.getVariableName(), item.getValue());
                }
            }
            HistoricProcessInstance historic = historyService.createHistoricProcessInstanceQuery()
                .processInstanceId(processInstanceId)
                .singleResult();
            if (historic != null) {
                businessKey = historic.getBusinessKey();
            }
        }
        String resolvedFormKey = resolveFormKey(formKey, businessKey);
        if (oConvertUtils.isNotEmpty(resolvedFormKey)) {
            FormSchemaPublishedResp published = formSchemaPublishService.getLatestPublished(resolvedFormKey);
            Set<String> whitelist = flowableVarMappingService.resolveVariableWhitelist(resolvedFormKey, published);
            if (!whitelist.isEmpty()) {
                Map<String, Object> filtered = new HashMap<>();
                for (Map.Entry<String, Object> entry : variables.entrySet()) {
                    if (whitelist.contains(entry.getKey())) {
                        filtered.put(entry.getKey(), entry.getValue());
                    }
                }
                return filtered;
            }
        }
        return variables;
    }

    @Override
    public FlowableTaskContextResp getTaskContext(String taskId) {
        if (oConvertUtils.isEmpty(taskId)) {
            throw new IllegalArgumentException("taskId is required");
        }
        Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
        if (task == null) {
            throw new IllegalStateException("task not found");
        }
        String processInstanceId = task.getProcessInstanceId();
        if (oConvertUtils.isEmpty(processInstanceId)) {
            throw new IllegalStateException("task has no process instance");
        }

        FlowableTaskContextResp resp = new FlowableTaskContextResp();
        resp.setTaskId(taskId);
        resp.setProcessInstanceId(processInstanceId);

        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "select record_id, form_key, schema_version from tr_proc_instance_link where process_instance_id = ? order by created_time desc limit 1",
                processInstanceId
            );
            if (!rows.isEmpty()) {
                Map<String, Object> row = rows.get(0);
                resp.setRecordId((String) row.get("record_id"));
                resp.setFormKey((String) row.get("form_key"));
                Object ver = row.get("schema_version");
                if (ver instanceof Integer) {
                    resp.setSchemaVersion((Integer) ver);
                } else if (ver != null) {
                    resp.setSchemaVersion(Integer.parseInt(ver.toString()));
                }
            }
        } catch (Exception e) {
            log.warn("failed to query task context: {}", e.getMessage());
        }

        if (oConvertUtils.isEmpty(resp.getRecordId())) {
            throw new IllegalStateException("process instance not linked to any form record");
        }
        return resp;
    }

    private FlowableTaskResp buildTaskResp(Task task) {
        FlowableTaskResp resp = new FlowableTaskResp();
        resp.setTaskId(task.getId());
        resp.setName(task.getName());
        resp.setProcessInstanceId(task.getProcessInstanceId());
        resp.setAssignee(task.getAssignee());
        resp.setCandidateGroups(getCandidateGroups(task.getId()));
        resp.setCreateTime(task.getCreateTime());
        return resp;
    }

    private List<String> getCandidateGroups(String taskId) {
        List<String> groups = new ArrayList<>();
        if (oConvertUtils.isEmpty(taskId)) {
            return groups;
        }
        try {
            List<IdentityLink> links = taskService.getIdentityLinksForTask(taskId);
            if (links != null) {
                for (IdentityLink link : links) {
                    if (link == null) {
                        continue;
                    }
                    if ("candidate".equals(link.getType()) && oConvertUtils.isNotEmpty(link.getGroupId())) {
                        groups.add(link.getGroupId());
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("flowable candidate group query failed: {}", ex.getMessage());
        }
        return groups;
    }

    private void ensureAmountVariable(Map<String, Object> variables, Map<String, Object> formData) {
        Object amountValue = variables.get("amount");
        if (amountValue == null && formData != null) {
            amountValue = formData.get("amount");
        }
        if (amountValue == null) {
            throw new IllegalArgumentException("amount is required for TRITIUM_APPROVAL_V1");
        }
        BigDecimal amount = toBigDecimalStrict(amountValue);
        if (amount == null) {
            throw new IllegalArgumentException("amount must be a number");
        }
        variables.put("amount", amount);
    }

    private BigDecimal toBigDecimalStrict(Object value) {
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return new BigDecimal(value.toString());
        }
        try {
            String text = value.toString().trim();
            if (text.isEmpty()) {
                return null;
            }
            return new BigDecimal(text);
        } catch (Exception ex) {
            return null;
        }
    }

    private void insertProcessLink(String processInstanceId,
                                   String processDefinitionKey,
                                   String businessKey,
                                   String formKey,
                                   String recordId,
                                   Integer schemaVersion,
                                   String createdBy) {
        if (oConvertUtils.isEmpty(processInstanceId) || oConvertUtils.isEmpty(processDefinitionKey)
            || oConvertUtils.isEmpty(formKey) || oConvertUtils.isEmpty(recordId)) {
            throw new IllegalArgumentException("process link requires processInstanceId, formKey, recordId");
        }
        String id = IdWorker.getIdStr();
        Date now = new Date();
        int updated = jdbcTemplate.update(
            "insert into tr_proc_instance_link (id, process_instance_id, process_definition_key, business_key, form_key, record_id, schema_version, created_time, created_by) values (?,?,?,?,?,?,?,?,?)",
            id,
            processInstanceId,
            processDefinitionKey,
            businessKey,
            formKey,
            recordId,
            schemaVersion,
            now,
            createdBy);
        if (updated < 1) {
            throw new IllegalStateException("failed to insert process instance link");
        }
    }

    private String resolveFormKey(String formKey, String businessKey) {
        if (oConvertUtils.isNotEmpty(formKey)) {
            return formKey;
        }
        if (oConvertUtils.isEmpty(businessKey)) {
            return null;
        }
        String[] parts = businessKey.split(":");
        if (parts.length >= 2 && "form".equalsIgnoreCase(parts[0])) {
            return parts[1];
        }
        return null;
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

    private String resolveCurrentUser(String requestedUser, String tokenUser) {
        if (oConvertUtils.isNotEmpty(tokenUser)) {
            if (oConvertUtils.isNotEmpty(requestedUser) && !tokenUser.equals(requestedUser)) {
                throw new SecurityException("forbidden");
            }
            return tokenUser;
        }
        return requestedUser;
    }

    private Set<String> resolveRoleCodes(String username) {
        if (oConvertUtils.isEmpty(username)) {
            return new HashSet<>();
        }
        try {
            Set<String> roles = sysUserService.getUserRolesSet(username);
            return roles == null ? new HashSet<>() : roles;
        } catch (Exception ex) {
            log.warn("resolve role codes failed: {}", ex.getMessage());
            return new HashSet<>();
        }
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
