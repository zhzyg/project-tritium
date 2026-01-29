package org.jeecg.modules.formmeta.controller;

import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.util.JwtUtil;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formengine.service.IFormSchemaPublishService;
import org.jeecg.modules.formmeta.dto.FormSchemaLatestResp;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishReq;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishResp;
import org.jeecg.modules.formmeta.dto.FormSchemaSaveReq;
import org.jeecg.modules.formmeta.dto.FormSchemaSaveResp;
import org.jeecg.modules.formmeta.dto.FormSchemaVersionResp;
import org.jeecg.modules.formmeta.entity.FormSchema;
import org.jeecg.modules.formmeta.service.IFormSchemaService;
import org.jeecg.modules.system.mapper.SysUserRoleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/form/schema")
public class FormSchemaController {

    @Autowired
    private IFormSchemaService formSchemaService;

    @Autowired
    private IFormSchemaPublishService formSchemaPublishService;

    @Autowired
    private SysUserRoleMapper sysUserRoleMapper;

    @PostMapping("/save")
    public Result<FormSchemaSaveResp> save(@RequestBody FormSchemaSaveReq req, HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getSchemaJson())) {
            return Result.error("formKey and schemaJson are required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        Integer status = Boolean.TRUE.equals(req.getPublish()) ? 1 : 0;
        FormSchema saved = formSchemaService.saveNewVersion(req.getFormKey(), req.getSchemaJson(), status, username);
        FormSchemaSaveResp resp = new FormSchemaSaveResp();
        resp.setFormKey(saved.getFormKey());
        resp.setVersion(saved.getVersion());
        resp.setSavedTime(saved.getCreatedTime());
        return Result.ok(resp);
    }

    @GetMapping("/latest")
    public Result<FormSchemaLatestResp> latest(@RequestParam(name = "formKey") String formKey) {
        if (oConvertUtils.isEmpty(formKey)) {
            return Result.error("formKey is required");
        }
        FormSchema latest = formSchemaService.getLatest(formKey);
        if (latest == null) {
            return Result.error(404, "schema not found");
        }
        FormSchemaLatestResp resp = new FormSchemaLatestResp();
        resp.setFormKey(latest.getFormKey());
        resp.setVersion(latest.getVersion());
        resp.setSchemaJson(latest.getSchemaJson());
        resp.setSavedTime(latest.getCreatedTime());
        return Result.ok(resp);
    }

    @GetMapping("/versions")
    public Result<List<FormSchemaVersionResp>> versions(@RequestParam(name = "formKey") String formKey) {
        if (oConvertUtils.isEmpty(formKey)) {
            return Result.error("formKey is required");
        }
        List<FormSchema> versions = formSchemaService.listVersions(formKey);
        List<FormSchemaVersionResp> respList = versions.stream().map(item -> {
            FormSchemaVersionResp resp = new FormSchemaVersionResp();
            resp.setFormKey(item.getFormKey());
            resp.setVersion(item.getVersion());
            resp.setStatus(item.getStatus());
            resp.setCreatedTime(item.getCreatedTime());
            return resp;
        }).collect(Collectors.toList());
        return Result.ok(respList);
    }

    @PostMapping("/publish")
    public Result<FormSchemaPublishResp> publish(@RequestBody FormSchemaPublishReq req, HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey())) {
            return Result.error("formKey is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        if (!isAdmin(username)) {
            return Result.error(403, "forbidden");
        }
        FormSchemaPublishResp resp = formSchemaPublishService.publish(req.getFormKey(), username);
        return Result.ok(resp);
    }

    private boolean isAdmin(String username) {
        if (oConvertUtils.isEmpty(username)) {
            return false;
        }
        List<String> roles = sysUserRoleMapper.getRoleByUserName(username);
        return roles != null && roles.contains("admin");
    }
}
