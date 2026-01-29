package org.jeecg.modules.formmeta.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FormSchemaLatestResp", description = "Form schema latest response")
public class FormSchemaLatestResp {
    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("version")
    private Integer version;

    @ApiModelProperty("schema json")
    private String schemaJson;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("saved time")
    private Date savedTime;
}
