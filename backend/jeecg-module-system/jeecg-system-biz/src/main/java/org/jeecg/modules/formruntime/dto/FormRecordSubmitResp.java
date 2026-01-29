package org.jeecg.modules.formruntime.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FormRecordSubmitResp", description = "Form record submit response")
public class FormRecordSubmitResp {
    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("schema version")
    private Integer schemaVersion;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("saved time")
    private Date savedTime;
}
