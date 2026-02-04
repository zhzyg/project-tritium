package org.jeecg.modules.formengine.service;

import org.jeecg.modules.formengine.dto.FormBpmnGetResp;
import org.jeecg.modules.formengine.dto.FormBpmnPublishResp;
import org.jeecg.modules.formengine.dto.FormBpmnSaveReq;
import org.jeecg.modules.formengine.dto.FormBpmnSaveResp;

public interface IFormBpmnService {
    FormBpmnGetResp getByFormKey(String formKey);

    FormBpmnSaveResp saveDraft(FormBpmnSaveReq req, String username);

    FormBpmnPublishResp publish(String formKey, String username);
}
