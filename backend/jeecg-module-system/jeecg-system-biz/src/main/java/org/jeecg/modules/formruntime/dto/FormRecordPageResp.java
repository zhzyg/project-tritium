package org.jeecg.modules.formruntime.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;
import java.util.Map;

@Data
@ApiModel(value = "FormRecordPageResp", description = "Form record page response")
public class FormRecordPageResp {
    @ApiModelProperty("record id")
    private String id;

    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("schema version")
    private Integer schemaVersion;

    @ApiModelProperty("created by")
    private String createdBy;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("created time")
    private Date createdTime;

    @ApiModelProperty("data json")
    private String dataJson;

    @ApiModelProperty("field values")
    private Map<String, Object> data;
}
