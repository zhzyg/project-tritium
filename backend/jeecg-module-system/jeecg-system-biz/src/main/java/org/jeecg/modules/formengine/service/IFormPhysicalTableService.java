package org.jeecg.modules.formengine.service;

import java.util.Date;

public interface IFormPhysicalTableService {
    void writeRecordIfPublished(String formKey, Integer schemaVersion, String recordId, String dataJson, String createdBy, Date createdTime);
}
