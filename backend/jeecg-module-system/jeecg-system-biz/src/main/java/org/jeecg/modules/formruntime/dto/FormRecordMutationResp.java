package org.jeecg.modules.formruntime.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FormRecordMutationResp", description = "Form runtime mutation response")
public class FormRecordMutationResp {
    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("schema version")
    private Integer schemaVersion;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("created time")
    private Date createdTime;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("updated time")
    private Date updatedTime;
}
