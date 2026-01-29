package org.jeecg.modules.formengine.service;

import org.jeecg.modules.formmeta.dto.FormSchemaPublishResp;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;

public interface IFormSchemaPublishService {
    FormSchemaPublishResp publish(String formKey, String username);

    FormSchemaPublishedResp getLatestPublished(String formKey);
}
