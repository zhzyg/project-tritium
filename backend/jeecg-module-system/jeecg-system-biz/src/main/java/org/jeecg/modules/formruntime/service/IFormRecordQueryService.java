package org.jeecg.modules.formruntime.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;
import org.jeecg.modules.formruntime.dto.FormRecordPageResp;

import java.util.Map;

public interface IFormRecordQueryService {
    IPage<FormRecordPageResp> queryPublishedPage(String formKey,
                                                 FormSchemaPublishedResp published,
                                                 int pageNo,
                                                 int pageSize,
                                                 String sortBy,
                                                 String sort,
                                                 Map<String, String> filters);

    FormRecordPageResp queryPublishedRecord(String formKey, FormSchemaPublishedResp published, String id);
}
