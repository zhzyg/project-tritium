package org.jeecg.modules.formruntime.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.jeecg.modules.formruntime.entity.FormRecord;
import org.jeecg.modules.formruntime.mapper.FormRecordMapper;
import org.jeecg.modules.formruntime.service.IFormRecordService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Service
public class FormRecordServiceImpl extends ServiceImpl<FormRecordMapper, FormRecord> implements IFormRecordService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormRecord createRecord(String formKey, Integer schemaVersion, String dataJson, String createdBy) {
        FormRecord record = new FormRecord()
            .setId(IdWorker.getIdStr())
            .setFormKey(formKey)
            .setSchemaVersion(schemaVersion)
            .setDataJson(dataJson)
            .setStatus(0)
            .setCreatedBy(createdBy)
            .setCreatedTime(new Date());
        boolean saved = this.save(record);
        if (!saved) {
            throw new IllegalStateException("Failed to save form record");
        }
        return record;
    }
}
