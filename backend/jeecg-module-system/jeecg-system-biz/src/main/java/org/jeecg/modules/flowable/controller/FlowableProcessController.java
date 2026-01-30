package org.jeecg.modules.flowable.controller;

import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.util.JwtUtil;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableProcessStartReq;
import org.jeecg.modules.flowable.dto.FlowableProcessStartResp;
import org.jeecg.modules.flowable.dto.FlowableProcessStatusResp;
import org.jeecg.modules.flowable.dto.FlowableProcessVarsReq;
import org.jeecg.modules.flowable.dto.FlowableTaskClaimReq;
import org.jeecg.modules.flowable.dto.FlowableTaskCompleteReq;
import org.jeecg.modules.flowable.dto.FlowableTaskQueryReq;
import org.jeecg.modules.flowable.dto.FlowableTaskResp;
import org.jeecg.modules.flowable.service.IFlowableProcessService;
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

    @PostMapping("/process/start")
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
}
