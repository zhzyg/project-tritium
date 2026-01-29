package org.jeecg.modules.formruntime.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.util.JwtUtil;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formmeta.entity.FormSchema;
import org.jeecg.modules.formmeta.service.IFormSchemaService;
import org.jeecg.modules.formruntime.dto.FormRecordPageResp;
import org.jeecg.modules.formruntime.dto.FormRecordSubmitReq;
import org.jeecg.modules.formruntime.dto.FormRecordSubmitResp;
import org.jeecg.modules.formruntime.entity.FormRecord;
import org.jeecg.modules.formruntime.service.IFormRecordService;
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
@RequestMapping("/form/data")
public class FormRecordController {

    @Autowired
    private IFormSchemaService formSchemaService;

    @Autowired
    private IFormRecordService formRecordService;

    @PostMapping("/submit")
    public Result<FormRecordSubmitResp> submit(@RequestBody FormRecordSubmitReq req, HttpServletRequest request) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getDataJson())) {
            return Result.error("formKey and dataJson are required");
        }
        FormSchema latestSchema = formSchemaService.getLatestPublished(req.getFormKey());
        if (latestSchema == null) {
            latestSchema = formSchemaService.getLatest(req.getFormKey());
        }
        if (latestSchema == null) {
            return Result.error(404, "schema not found");
        }
        String username = JwtUtil.getUserNameByToken(request);
        FormRecord record = formRecordService.createRecord(req.getFormKey(), latestSchema.getVersion(), req.getDataJson(), username);
        FormRecordSubmitResp resp = new FormRecordSubmitResp();
        resp.setRecordId(record.getId());
        resp.setFormKey(record.getFormKey());
        resp.setSchemaVersion(record.getSchemaVersion());
        resp.setSavedTime(record.getCreatedTime());
        return Result.ok(resp);
    }

    @GetMapping("/page")
    public Result<IPage<FormRecordPageResp>> page(
        @RequestParam(name = "formKey") String formKey,
        @RequestParam(name = "pageNo", defaultValue = "1") Integer pageNo,
        @RequestParam(name = "pageSize", defaultValue = "10") Integer pageSize) {
        if (oConvertUtils.isEmpty(formKey)) {
            return Result.error("formKey is required");
        }
        Page<FormRecord> page = new Page<>(pageNo, pageSize);
        IPage<FormRecord> pageData = formRecordService.lambdaQuery()
            .eq(FormRecord::getFormKey, formKey)
            .eq(FormRecord::getStatus, 0)
            .orderByDesc(FormRecord::getCreatedTime)
            .page(page);

        List<FormRecordPageResp> records = pageData.getRecords().stream().map(item -> {
            FormRecordPageResp resp = new FormRecordPageResp();
            resp.setId(item.getId());
            resp.setSchemaVersion(item.getSchemaVersion());
            resp.setCreatedBy(item.getCreatedBy());
            resp.setCreatedTime(item.getCreatedTime());
            resp.setDataJson(item.getDataJson());
            return resp;
        }).collect(Collectors.toList());

        Page<FormRecordPageResp> respPage = new Page<>(pageNo, pageSize);
        respPage.setTotal(pageData.getTotal());
        respPage.setRecords(records);
        return Result.ok(respPage);
    }

    @GetMapping("/get")
    public Result<FormRecordPageResp> get(@RequestParam(name = "id") String id) {
        if (oConvertUtils.isEmpty(id)) {
            return Result.error("id is required");
        }
        FormRecord record = formRecordService.getById(id);
        if (record == null) {
            return Result.error(404, "record not found");
        }
        FormRecordPageResp resp = new FormRecordPageResp();
        resp.setId(record.getId());
        resp.setSchemaVersion(record.getSchemaVersion());
        resp.setCreatedBy(record.getCreatedBy());
        resp.setCreatedTime(record.getCreatedTime());
        resp.setDataJson(record.getDataJson());
        return Result.ok(resp);
    }
}
