package org.jeecg.modules.formruntime.dto;

import lombok.Data;

import java.util.List;

@Data
public class FormRecordDeleteReq {
    private String formKey;
    private List<String> recordIds;
    private List<String> ids;
}
