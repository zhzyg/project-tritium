package org.jeecg.modules.formruntime.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.jeecg.modules.formruntime.entity.FormRecord;

public interface IFormRecordService extends IService<FormRecord> {
    FormRecord createRecord(String formKey, Integer schemaVersion, String dataJson, String createdBy);
}
