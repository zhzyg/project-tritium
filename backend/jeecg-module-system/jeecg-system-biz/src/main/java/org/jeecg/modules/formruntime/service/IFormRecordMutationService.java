package org.jeecg.modules.formruntime.service;

import org.jeecg.modules.formruntime.dto.FormRecordMutationReq;
import org.jeecg.modules.formruntime.dto.FormRecordMutationResp;

import java.util.List;

public interface IFormRecordMutationService {
    FormRecordMutationResp insert(FormRecordMutationReq req, String username);

    FormRecordMutationResp update(FormRecordMutationReq req, String username);

    int deleteBatch(String formKey, List<String> recordIds, String username);
}
