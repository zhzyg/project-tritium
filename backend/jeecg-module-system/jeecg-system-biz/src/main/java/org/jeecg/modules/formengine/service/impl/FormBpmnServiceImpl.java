package org.jeecg.modules.formengine.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.repository.Deployment;
import org.flowable.engine.repository.ProcessDefinition;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableFormBindReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefRegReq;
import org.jeecg.modules.flowable.service.IProcessRegistryService;
import org.jeecg.modules.formengine.dto.FormBpmnGetResp;
import org.jeecg.modules.formengine.dto.FormBpmnPublishResp;
import org.jeecg.modules.formengine.dto.FormBpmnSaveReq;
import org.jeecg.modules.formengine.dto.FormBpmnSaveResp;
import org.jeecg.modules.formengine.service.IFormBpmnService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class FormBpmnServiceImpl implements IFormBpmnService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    private RepositoryService repositoryService;

    @Autowired
    private IProcessRegistryService processRegistryService;

    @Autowired
    public FormBpmnServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public FormBpmnGetResp getByFormKey(String formKey) {
        if (oConvertUtils.isEmpty(formKey)) {
            return null;
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "select form_key, bpmn_xml, bpmn_hash, status, proc_def_key, proc_def_id, deployment_id, published_time, updated_time "
                + "from tr_form_bpmn where form_key=? limit 1",
            formKey
        );
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Map<String, Object> row = rows.get(0);
        FormBpmnGetResp resp = new FormBpmnGetResp();
        resp.setFormKey(getString(row, "form_key"));
        resp.setBpmnXml(getString(row, "bpmn_xml"));
        resp.setBpmnHash(getString(row, "bpmn_hash"));
        resp.setStatus(getString(row, "status"));
        resp.setProcDefKey(getString(row, "proc_def_key"));
        resp.setProcDefId(getString(row, "proc_def_id"));
        resp.setDeploymentId(getString(row, "deployment_id"));
        resp.setPublishedTime(getDate(row, "published_time"));
        resp.setUpdatedTime(getDate(row, "updated_time"));
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormBpmnSaveResp saveDraft(FormBpmnSaveReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getBpmnXml())) {
            throw new IllegalArgumentException("formKey and bpmnXml are required");
        }
        validateFormKey(req.getFormKey());
        String hash = md5(req.getBpmnXml());
        Date now = new Date();
        String id = IdWorker.getIdStr();
        jdbcTemplate.update(
            "insert into tr_form_bpmn (id, form_key, bpmn_xml, bpmn_hash, status, created_time, created_by, updated_time, updated_by) "
                + "values (?,?,?,?,?,?,?,?,?) "
                + "on duplicate key update bpmn_xml=values(bpmn_xml), bpmn_hash=values(bpmn_hash), status='draft', updated_time=values(updated_time), updated_by=values(updated_by)",
            id,
            req.getFormKey(),
            req.getBpmnXml(),
            hash,
            "draft",
            now,
            username,
            now,
            username
        );
        FormBpmnSaveResp resp = new FormBpmnSaveResp();
        resp.setFormKey(req.getFormKey());
        resp.setStatus("draft");
        resp.setBpmnHash(hash);
        resp.setUpdatedTime(now);
        log.info("Form BPMN draft saved: formKey={}, hash={}, xmlLength={}",
            req.getFormKey(),
            hash,
            req.getBpmnXml().length());
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormBpmnPublishResp publish(String formKey, String username) {
        if (oConvertUtils.isEmpty(formKey)) {
            throw new IllegalArgumentException("formKey is required");
        }
        validateFormKey(formKey);
        FormBpmnGetResp current = getByFormKey(formKey);
        if (current == null || oConvertUtils.isEmpty(current.getBpmnXml())) {
            throw new IllegalStateException("bpmn xml not found");
        }
        String xml = current.getBpmnXml();
        String hash = md5(xml);
        if (hash.equals(current.getBpmnHash())
            && "published".equalsIgnoreCase(current.getStatus())
            && oConvertUtils.isNotEmpty(current.getProcDefId())
            && oConvertUtils.isNotEmpty(current.getDeploymentId())) {
            FormBpmnPublishResp cached = new FormBpmnPublishResp();
            cached.setFormKey(formKey);
            cached.setProcDefKey(current.getProcDefKey());
            cached.setProcDefId(current.getProcDefId());
            cached.setDeploymentId(current.getDeploymentId());
            cached.setPublishedTime(current.getPublishedTime());
            return cached;
        }

        String resourceName = formKey + ".bpmn20.xml";
        Deployment deployment = repositoryService.createDeployment()
            .name("form-" + formKey)
            .addString(resourceName, xml)
            .deploy();

        List<ProcessDefinition> defs = repositoryService.createProcessDefinitionQuery()
            .deploymentId(deployment.getId())
            .orderByProcessDefinitionVersion()
            .desc()
            .list();
        if (defs == null || defs.isEmpty()) {
            throw new IllegalStateException("process definition not found after deployment");
        }
        ProcessDefinition pd = defs.get(0);
        String procDefKey = pd.getKey();
        String procDefId = pd.getId();
        Integer version = pd.getVersion();
        Date now = new Date();

        jdbcTemplate.update(
            "update tr_form_bpmn set bpmn_xml=?, bpmn_hash=?, status=?, proc_def_key=?, proc_def_id=?, deployment_id=?, published_time=?, updated_time=?, updated_by=? "
                + "where form_key=?",
            xml,
            hash,
            "published",
            procDefKey,
            procDefId,
            deployment.getId(),
            now,
            now,
            username,
            formKey
        );

        FlowableProcessDefRegReq regReq = new FlowableProcessDefRegReq();
        regReq.setProcessKey(procDefKey);
        regReq.setName(pd.getName());
        regReq.setCategory(pd.getCategory());
        regReq.setEnabled(1);
        regReq.setIsDefault(1);
        processRegistryService.registerDef(regReq, username);

        FlowableFormBindReq bindReq = new FlowableFormBindReq();
        bindReq.setFormKey(formKey);
        bindReq.setProcessKey(procDefKey);
        processRegistryService.setDefaultBinding(bindReq, username);

        FormBpmnPublishResp resp = new FormBpmnPublishResp();
        resp.setFormKey(formKey);
        resp.setProcDefKey(procDefKey);
        resp.setProcDefId(procDefId);
        resp.setDeploymentId(deployment.getId());
        resp.setVersion(version);
        resp.setPublishedTime(now);
        log.info("Form BPMN published: formKey={}, procDefKey={}, version={}, hash={}",
            formKey,
            procDefKey,
            version,
            hash);
        return resp;
    }

    private void validateFormKey(String formKey) {
        if (oConvertUtils.isEmpty(formKey)) {
            throw new IllegalArgumentException("formKey is required");
        }
        if (formKey.length() > 128) {
            throw new IllegalArgumentException("formKey too long");
        }
        if (!formKey.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("formKey invalid");
        }
    }

    private String md5(String raw) {
        return DigestUtils.md5DigestAsHex(raw.getBytes(StandardCharsets.UTF_8));
    }

    private String getString(Map<String, Object> row, String key) {
        if (row == null) {
            return null;
        }
        Object val = row.get(key);
        return val == null ? null : val.toString();
    }

    private Date getDate(Map<String, Object> row, String key) {
        if (row == null) {
            return null;
        }
        Object val = row.get(key);
        if (val instanceof Date) {
            return (Date) val;
        }
        return null;
    }
}
