package org.jeecg.modules.formruntime.service;

import org.jeecg.modules.formruntime.dto.FormRecordMutationReq;
import org.jeecg.modules.formruntime.dto.FormRecordMutationResp;

public interface IFormRecordMutationService {
    FormRecordMutationResp insert(FormRecordMutationReq req, String username);

    FormRecordMutationResp update(FormRecordMutationReq req, String username);
}
