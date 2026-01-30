package org.jeecg.modules.flowable.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.dto.FlowableFormBindReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefRegReq;
import org.jeecg.modules.flowable.dto.FlowableProcessDefResp;
import org.jeecg.modules.flowable.service.IProcessRegistryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ProcessRegistryServiceImpl implements IProcessRegistryService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public ProcessRegistryServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public List<FlowableProcessDefResp> listDefs() {
        List<FlowableProcessDefResp> list = new ArrayList<>();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "select process_definition_key, name, category, enabled, is_default from tr_proc_def_registry order by created_time desc");
        for (Map<String, Object> row : rows) {
            FlowableProcessDefResp resp = new FlowableProcessDefResp();
            resp.setProcessKey(getString(row, "process_definition_key"));
            resp.setName(getString(row, "name"));
            resp.setCategory(getString(row, "category"));
            resp.setEnabled(getInt(row, "enabled"));
            resp.setIsDefault(getInt(row, "is_default"));
            list.add(resp);
        }
        return list;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void registerDef(FlowableProcessDefRegReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getProcessKey())) {
            throw new IllegalArgumentException("processKey is required");
        }
        Integer enabled = req.getEnabled() == null ? 1 : req.getEnabled();
        Integer isDefault = req.getIsDefault() == null ? 0 : req.getIsDefault();
        if (isDefault != null && isDefault == 1) {
            jdbcTemplate.update("update tr_proc_def_registry set is_default=0, updated_time=?, updated_by=?", new Date(), username);
        }
        String id = IdWorker.getIdStr();
        Date now = new Date();
        int updated = jdbcTemplate.update(
            "insert into tr_proc_def_registry (id, process_definition_key, name, category, enabled, is_default, created_time, created_by) values (?,?,?,?,?,?,?,?) "
                + "on duplicate key update name=values(name), category=values(category), enabled=values(enabled), is_default=values(is_default), updated_time=?, updated_by=?",
            id,
            req.getProcessKey(),
            req.getName(),
            req.getCategory(),
            enabled,
            isDefault,
            now,
            username,
            now,
            username);
        if (updated < 1) {
            throw new IllegalStateException("failed to register process definition");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setDefaultBinding(FlowableFormBindReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey()) || oConvertUtils.isEmpty(req.getProcessKey())) {
            throw new IllegalArgumentException("formKey and processKey are required");
        }
        List<Integer> enabledList = jdbcTemplate.queryForList(
            "select enabled from tr_proc_def_registry where process_definition_key=?",
            new Object[]{req.getProcessKey()},
            Integer.class);
        if (enabledList == null || enabledList.isEmpty() || enabledList.get(0) == null || enabledList.get(0) != 1) {
            throw new IllegalStateException("process definition not enabled");
        }
        jdbcTemplate.update("delete from tr_form_proc_bind where form_key=? and process_definition_key<>?",
            req.getFormKey(), req.getProcessKey());
        String id = IdWorker.getIdStr();
        int updated = jdbcTemplate.update(
            "insert into tr_form_proc_bind (id, form_key, process_definition_key, enabled, is_default, created_time, created_by) values (?,?,?,?,?,?,?) "
                + "on duplicate key update enabled=values(enabled), is_default=values(is_default), updated_time=?, updated_by=?",
            id,
            req.getFormKey(),
            req.getProcessKey(),
            1,
            1,
            new Date(),
            username,
            new Date(),
            username);
        if (updated < 1) {
            throw new IllegalStateException("failed to bind process to form");
        }
    }

    @Override
    public String resolveDefaultProcessKey(String formKey) {
        if (oConvertUtils.isEmpty(formKey)) {
            return null;
        }
        List<String> list = jdbcTemplate.queryForList(
            "select b.process_definition_key from tr_form_proc_bind b join tr_proc_def_registry r on r.process_definition_key=b.process_definition_key "
                + "where b.form_key=? and b.enabled=1 and b.is_default=1 and r.enabled=1 limit 1",
            new Object[]{formKey},
            String.class);
        if (list == null || list.isEmpty()) {
            return null;
        }
        return list.get(0);
    }

    private String getString(Map<String, Object> row, String key) {
        Object val = row.get(key);
        return val == null ? null : val.toString();
    }

    private Integer getInt(Map<String, Object> row, String key) {
        Object val = row.get(key);
        if (val == null) {
            return null;
        }
        if (val instanceof Number) {
            return ((Number) val).intValue();
        }
        try {
            return Integer.parseInt(val.toString());
        } catch (Exception ex) {
            return null;
        }
    }
}
