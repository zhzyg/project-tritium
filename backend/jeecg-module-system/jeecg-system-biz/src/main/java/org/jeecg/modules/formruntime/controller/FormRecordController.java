package org.jeecg.modules.formruntime.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.api.vo.Result;
import org.jeecg.common.system.util.JwtUtil;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formmeta.entity.FormSchema;
import org.jeecg.modules.formmeta.service.IFormSchemaService;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;
import org.jeecg.modules.formengine.service.IFormSchemaPublishService;
import org.jeecg.modules.formruntime.dto.FormRecordPageResp;
import org.jeecg.modules.formruntime.dto.FormRecordMutationReq;
import org.jeecg.modules.formruntime.dto.FormRecordMutationResp;
import org.jeecg.modules.formruntime.dto.FormRecordSubmitReq;
import org.jeecg.modules.formruntime.dto.FormRecordSubmitResp;
import org.jeecg.modules.formruntime.entity.FormRecord;
import org.jeecg.modules.formruntime.service.IFormRecordMutationService;
import org.jeecg.modules.formruntime.service.IFormRecordQueryService;
import org.jeecg.modules.formruntime.service.IFormRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/form/data")
public class FormRecordController {

    @Autowired
    private IFormSchemaService formSchemaService;

    @Autowired
    private IFormRecordService formRecordService;

    @Autowired
    private IFormRecordQueryService formRecordQueryService;

    @Autowired
    private IFormRecordMutationService formRecordMutationService;

    @Autowired
    private IFormSchemaPublishService formSchemaPublishService;

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

    @PostMapping("/insert")
    public Result<FormRecordMutationResp> insert(@RequestBody FormRecordMutationReq req, HttpServletRequest request) {
        if (req == null) {
            return Result.error("request body is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(formRecordMutationService.insert(req, username));
        } catch (RuntimeException ex) {
            log.warn("Runtime insert failed: {}", ex.getMessage());
            return Result.error(resolveMutationCode(ex.getMessage()), ex.getMessage());
        }
    }

    @PostMapping("/update")
    public Result<FormRecordMutationResp> update(@RequestBody FormRecordMutationReq req, HttpServletRequest request) {
        if (req == null) {
            return Result.error("request body is required");
        }
        String username = JwtUtil.getUserNameByToken(request);
        try {
            return Result.ok(formRecordMutationService.update(req, username));
        } catch (RuntimeException ex) {
            log.warn("Runtime update failed: {}", ex.getMessage());
            return Result.error(resolveMutationCode(ex.getMessage()), ex.getMessage());
        }
    }

    @GetMapping("/page")
    public Result<IPage<FormRecordPageResp>> page(
        @RequestParam(name = "formKey") String formKey,
        @RequestParam(name = "pageNo", defaultValue = "1") Integer pageNo,
        @RequestParam(name = "pageSize", defaultValue = "10") Integer pageSize,
        @RequestParam(name = "sortBy", required = false) String sortBy,
        @RequestParam(name = "sort", required = false) String sort,
        HttpServletRequest request) {
        if (oConvertUtils.isEmpty(formKey)) {
            return Result.error("formKey is required");
        }
        FormSchemaPublishedResp published = formSchemaPublishService.getLatestPublished(formKey);
        if (published != null) {
            Map<String, String> filters = extractFilters(request);
            IPage<FormRecordPageResp> pageData = formRecordQueryService.queryPublishedPage(
                formKey,
                published,
                pageNo,
                pageSize,
                sortBy,
                sort,
                filters);
            return Result.ok(pageData);
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
            resp.setRecordId(item.getId());
            resp.setSchemaVersion(item.getSchemaVersion());
            resp.setCreatedBy(item.getCreatedBy());
            resp.setCreatedTime(item.getCreatedTime());
            resp.setDataJson(item.getDataJson());
            resp.setData(parseData(item.getDataJson()));
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
        if (record != null) {
            FormSchemaPublishedResp published = formSchemaPublishService.getLatestPublished(record.getFormKey());
            if (published != null) {
                FormRecordPageResp physical = formRecordQueryService.queryPublishedRecord(record.getFormKey(), published, id);
                if (physical != null) {
                    return Result.ok(physical);
                }
            }
        }
        if (record == null) {
            return Result.error(404, "record not found");
        }
        FormRecordPageResp resp = new FormRecordPageResp();
        resp.setId(record.getId());
        resp.setRecordId(record.getId());
        resp.setSchemaVersion(record.getSchemaVersion());
        resp.setCreatedBy(record.getCreatedBy());
        resp.setCreatedTime(record.getCreatedTime());
        resp.setDataJson(record.getDataJson());
        resp.setData(parseData(record.getDataJson()));
        return Result.ok(resp);
    }

    private Map<String, String> extractFilters(HttpServletRequest request) {
        Map<String, String> filters = new HashMap<>();
        Map<String, String[]> params = request.getParameterMap();
        if (params == null) {
            return filters;
        }
        for (Map.Entry<String, String[]> entry : params.entrySet()) {
            String key = entry.getKey();
            if (key == null || !key.startsWith("q_")) {
                continue;
            }
            String fieldKey = key.substring(2);
            String[] values = entry.getValue();
            if (values == null || values.length == 0) {
                continue;
            }
            filters.put(fieldKey, values[0]);
        }
        return filters;
    }

    private Map<String, Object> parseData(String dataJson) {
        if (oConvertUtils.isEmpty(dataJson)) {
            return null;
        }
        try {
            return JSON.parseObject(dataJson);
        } catch (Exception ex) {
            return null;
        }
    }

    private int resolveMutationCode(String message) {
        if (message == null) {
            return 400;
        }
        String lower = message.toLowerCase();
        if (lower.contains("not found")) {
            return 404;
        }
        if (lower.contains("already exists")) {
            return 409;
        }
        return 400;
    }
}
