package org.jeecg.modules.formengine.controller;

import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.util.JwtUtil;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formengine.dto.FormBpmnGetResp;
import org.jeecg.modules.formengine.dto.FormBpmnPublishReq;
import org.jeecg.modules.formengine.dto.FormBpmnPublishResp;
import org.jeecg.modules.formengine.dto.FormBpmnSaveReq;
import org.jeecg.modules.formengine.dto.FormBpmnSaveResp;
import org.jeecg.modules.formengine.service.IFormBpmnService;
import org.jeecg.modules.system.mapper.SysUserRoleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/form/bpmn")
public class FormBpmnController {

    @Autowired
    private IFormBpmnService formBpmnService;

    @Autowired
    private SysUserRoleMapper sysUserRoleMapper;

    @GetMapping("/get")
    public Result<FormBpmnGetResp> get(String formKey) {
        if (oConvertUtils.isEmpty(formKey)) {
            return Result.error("formKey is required");
        }
        try {
            FormBpmnGetResp resp = formBpmnService.getByFormKey(formKey);
            if (resp == null) {
                FormBpmnGetResp empty = new FormBpmnGetResp();
                empty.setFormKey(formKey);
                empty.setStatus("draft");
                return Result.ok(empty);
            }
            return Result.ok(resp);
        } catch (RuntimeException ex) {
            log.warn("form bpmn get failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/save")
    public Result<FormBpmnSaveResp> save(@RequestBody FormBpmnSaveReq req, HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getBpmnXml())) {
            return Result.error("formKey and bpmnXml are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        if (!isAdmin(username)) {
            return Result.error(403, "forbidden");
        }
        try {
            return Result.ok(formBpmnService.saveDraft(req, username));
        } catch (RuntimeException ex) {
            log.warn("form bpmn save failed: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
    }

    @PostMapping("/publish")
    public Result<FormBpmnPublishResp> publish(@RequestBody FormBpmnPublishReq req, HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey())) {
            return Result.error("formKey is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        if (!isAdmin(username)) {
            return Result.error(403, "forbidden");
        }
        try {
            return Result.ok(formBpmnService.publish(req.getFormKey(), username));
        } catch (RuntimeException ex) {
            log.warn("form bpmn publish failed: {}", ex.getMessage());
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
}
