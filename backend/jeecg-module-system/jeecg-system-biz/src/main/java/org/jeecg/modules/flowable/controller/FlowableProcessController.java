package org.jeecg.modules.flowable.controller;

import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.util.JwtUtil;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStartByFormReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartByFormResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStatusResp;
import org.jeecg.modules.flowable.dto.FlowableProcessVarsReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefRegReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefResp;
import org.jeecg.modules.flowable.dto.FlowableFormBindReq;
import org.jeecg.modules.flowable.dto.FlowableProcFormBindResp;
import org.jeecg.modules.flowable.dto.FlowableTaskClaimReq;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;
import org.jeecg.modules.flowable.dto.FlowableTaskContextResp;
import org.jeecg.modules.flowable.dto.FlowableProcessTraceResp;
import org.jeecg.modules.flowable.dto.FlowableTaskCommentResp;
import org.jeecg.modules.flowable.dto.FlowableHistoricTaskResp;
import org.jeecg.modules.flowable.dto.FlowableHistoricProcessInstanceResp;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldPermReq;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldPermResp;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldRuleReq;
import org.jeecg.modules.flowable.dto.FlowableTaskFieldRuleResp;
import org.jeecg.modules.flowable.service.IFlowableProcessService;
import org.jeecg.modules.flowable.service.IProcessRegistryService;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.jeecg.modules.system.mapper.SysUserRoleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/bpm")
public class FlowableProcessController {

    @Autowired
    private IFlowableProcessService flowableProcessService;

    @Autowired
    private IProcessRegistryService processRegistryService;

    @Autowired
    private SysUserRoleMapper sysUserRoleMapper;

    @GetMapping("/defs/list")
    public Result<List<FlowableProcessDefResp>> listDefs() {
        try {
            return Result.ok(processRegistryService.listDefs());
        } catch (RuntimeException ex) {
            log.warn("Flowable def list failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/defs/register")
    public Result<Object> registerDef(@RequestBody FlowableProcessDefRegReq req,
                                      HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessKey())) {
            return Result.error("processKey is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            processRegistryService.registerDef(req, username);
            return Result.ok("ok");
        } catch (RuntimeException ex) {
            log.warn("Flowable def register failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/bind/setDefault")
    public Result<Object> setDefaultBind(@RequestBody FlowableFormBindReq req,
                                         HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getProcessKey())) {
            return Result.error("formKey and processKey are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            processRegistryService.setDefaultBinding(req, username);
            return Result.ok("ok");
        } catch (RuntimeException ex) {
            log.warn("Flowable bind failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/procFormBind/upsert")
    public Result<Object> upsertProcFormBind(@RequestBody FlowableFormBindReq req,
                                             HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getProcessKey())) {
            return Result.error("formKey and processKey are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            processRegistryService.setDefaultBinding(req, username);
            return Result.ok("ok");
        } catch (RuntimeException ex) {
            log.warn("Flowable bind upsert failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/procFormBind/getByProcDefKey")
    public Result<FlowableProcFormBindResp> getProcFormBindByKey(String procDefKey, String processKey) {
        String key = oConvertUtils.isNotEmpty(procDefKey) ? procDefKey : processKey;
        if (oConvertUtils.isEmpty(key)) {
            return Result.error("procDefKey is required");
        }
        try {
            return Result.ok(processRegistryService.getDefaultBindByProcessKey(key));
        } catch (RuntimeException ex) {
            log.warn("Flowable bind query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/process/start")
    @RequiresPermissions("bpm:start")
    public Result<FlowableProcessStartResp> startProcess(@RequestBody FlowableProcessStartReq req,
                                                         HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessKey())) {
            return Result.error("processKey is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(flowableProcessService.startProcess(req, username));
        } catch (RuntimeException ex) {
            log.warn("Flowable start failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/process/startByForm")
    @RequiresPermissions("bpm:start")
    public Result<FlowableProcessStartByFormResp> startProcessByForm(@RequestBody FlowableProcessStartByFormReq req,
                                                                     HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getRecordId())) {
            return Result.error("formKey and recordId are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(flowableProcessService.startProcessByForm(req, username));
        } catch (RuntimeException ex) {
            log.warn("Flowable startByForm failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }
    @PostMapping("/task/my")
    public Result<List<FlowableTaskResp>> myTasks(@RequestBody(required = false) FlowableTaskQueryReq req,
                                                  HttpServletRequest request) {
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(flowableProcessService.queryTasks(req, username));
        } catch (SecurityException ex) {
            log.warn("Flowable task query forbidden: {}", ex.getMessage());
            return Result.error(403, ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("Flowable task query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/task/complete")
    public Result<Object> completeTask(@RequestBody FlowableTaskCompleteReq req,
                                       HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getTaskId())) {
            return Result.error("taskId is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            flowableProcessService.completeTask(req, username);
            return Result.ok("ok");
        } catch (SecurityException ex) {
            log.warn("Flowable task complete forbidden: {}", ex.getMessage());
            return Result.error(403, ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("Flowable task complete failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/task/claim")
    public Result<Object> claimTask(@RequestBody FlowableTaskClaimReq req,
                                    HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getTaskId())) {
            return Result.error("taskId is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            flowableProcessService.claimTask(req, username);
            return Result.ok("ok");
        } catch (SecurityException ex) {
            log.warn("Flowable task claim forbidden: {}", ex.getMessage());
            return Result.error(403, ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("Flowable task claim failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/process/vars")
    public Result<Map<String, Object>> processVars(@RequestBody FlowableProcessVarsReq req) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessInstanceId())) {
            return Result.error("processInstanceId is required");
        }
        try {
            return Result.ok(flowableProcessService.getProcessVariables(req.getProcessInstanceId(), req.getFormKey()));
        } catch (RuntimeException ex) {
            log.warn("Flowable vars query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/process/status")
    public Result<FlowableProcessStatusResp> processStatus(String processInstanceId) {
        if (oConvertUtils.isEmpty(processInstanceId)) {
            return Result.error("processInstanceId is required");
        }
        try {
            return Result.ok(flowableProcessService.getProcessStatus(processInstanceId));
        } catch (RuntimeException ex) {
            log.warn("Flowable status query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/task/context")
    public Result<FlowableTaskContextResp> getTaskContext(String taskId) {
        if (oConvertUtils.isEmpty(taskId)) {
            return Result.error("taskId is required");
        }
        try {
            return Result.ok(flowableProcessService.getTaskContext(taskId));
        } catch (Exception ex) {
            log.warn("getTaskContext failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/task/fieldPerm")
    public Result<FlowableTaskFieldPermResp> getTaskFieldPerm(String procDefKey, String taskDefKey, String formKey) {
        if (oConvertUtils.isEmpty(procDefKey) || oConvertUtils.isEmpty(taskDefKey) || oConvertUtils.isEmpty(formKey)) {
            return Result.error("procDefKey, taskDefKey and formKey are required");
        }
        try {
            return Result.ok(flowableProcessService.getTaskFieldPerm(procDefKey, taskDefKey, formKey));
        } catch (RuntimeException ex) {
            log.warn("getTaskFieldPerm failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/task/fieldPerm/upsert")
    public Result<Object> upsertTaskFieldPerm(@RequestBody FlowableTaskFieldPermReq req,
                                              HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getProcDefKey()) || oConvertUtils.isEmpty(req.getTaskDefKey()) || oConvertUtils.isEmpty(req.getFormKey())) {
            return Result.error("procDefKey, taskDefKey and formKey are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        if (!isAdmin(username)) {
            return Result.error(403, "forbidden");
        }
        try {
            flowableProcessService.upsertTaskFieldPerm(req, username);
            return Result.ok("ok");
        } catch (RuntimeException ex) {
            log.warn("upsertTaskFieldPerm failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/taskFieldRule/getByTask")
    public Result<FlowableTaskFieldRuleResp> getTaskFieldRuleByTask(String taskId) {
        if (oConvertUtils.isEmpty(taskId)) {
            return Result.error("taskId is required");
        }
        try {
            return Result.ok(flowableProcessService.getTaskFieldRuleByTask(taskId));
        } catch (RuntimeException ex) {
            log.warn("getTaskFieldRuleByTask failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/taskFieldRule/listByProc")
    public Result<List<FlowableTaskFieldRuleResp>> listTaskFieldRuleByProc(String procDefKey) {
        if (oConvertUtils.isEmpty(procDefKey)) {
            return Result.error("procDefKey is required");
        }
        try {
            return Result.ok(flowableProcessService.listTaskFieldRuleByProc(procDefKey));
        } catch (RuntimeException ex) {
            log.warn("listTaskFieldRuleByProc failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/taskFieldRule/upsert")
    public Result<Object> upsertTaskFieldRule(@RequestBody FlowableTaskFieldRuleReq req,
                                              HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getProcDefKey()) || oConvertUtils.isEmpty(req.getTaskDefKey())) {
            return Result.error("procDefKey and taskDefKey are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        if (!isAdmin(username)) {
            return Result.error(403, "forbidden");
        }
        try {
            flowableProcessService.upsertTaskFieldRule(req, username);
            return Result.ok("ok");
        } catch (RuntimeException ex) {
            log.warn("upsertTaskFieldRule failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/process/context")
    public Result<FlowableTaskContextResp> getProcessContext(String processInstanceId) {
        if (oConvertUtils.isEmpty(processInstanceId)) {
            return Result.error("processInstanceId is required");
        }
        try {
            return Result.ok(flowableProcessService.getProcessContext(processInstanceId));
        } catch (Exception ex) {
            log.warn("getProcessContext failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    private boolean isAdmin(String username) {
        if (oConvertUtils.isEmpty(username)) {
            return false;
        }
        List<String> roles = sysUserRoleMapper.getRoleByUserName(username);
        return roles != null && roles.contains("admin");
    }

    @GetMapping("/task/my")
    public Result<List<FlowableTaskResp>> listTasks(FlowableTaskQueryReq req, HttpServletRequest request) {
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(flowableProcessService.queryTasks(req, username));
        } catch (RuntimeException ex) {
            log.warn("Flowable task query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/process/trace")
    public Result<List<FlowableProcessTraceResp>> processTrace(String procInstId) {
        if (oConvertUtils.isEmpty(procInstId)) {
            return Result.error("procInstId is required");
        }
        try {
            return Result.ok(flowableProcessService.getProcessTrace(procInstId));
        } catch (Exception ex) {
            log.warn("getProcessTrace failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/task/comments")
    public Result<List<FlowableTaskCommentResp>> getTaskComments(String taskId) {
        if (oConvertUtils.isEmpty(taskId)) {
            return Result.error("taskId is required");
        }
        try {
            return Result.ok(flowableProcessService.getTaskComments(taskId));
        } catch (Exception ex) {
            log.warn("getTaskComments failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/task/done")
    public Result<List<FlowableHistoricTaskResp>> listDoneTasks(FlowableTaskQueryReq req, HttpServletRequest request) {
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(flowableProcessService.queryDoneTasks(req, username));
        } catch (RuntimeException ex) {
            log.warn("Flowable done task query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @GetMapping("/process/my")
    public Result<List<FlowableHistoricProcessInstanceResp>> listMyProcesses(FlowableTaskQueryReq req, HttpServletRequest request) {
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(flowableProcessService.queryMyStartedProcesses(req, username));
        } catch (RuntimeException ex) {
            log.warn("Flowable my process query failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }
}
