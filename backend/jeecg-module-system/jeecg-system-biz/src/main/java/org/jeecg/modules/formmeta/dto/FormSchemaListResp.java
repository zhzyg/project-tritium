package org.jeecg.modules.formmeta.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FormSchemaListResp", description = "Form schema list response")
public class FormSchemaListResp {
    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("form name")
    private String formName;

    @ApiModelProperty("version")
    private Integer version;

    @ApiModelProperty("status")
    private Integer status;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("updated time")
    private Date updatedTime;
}
