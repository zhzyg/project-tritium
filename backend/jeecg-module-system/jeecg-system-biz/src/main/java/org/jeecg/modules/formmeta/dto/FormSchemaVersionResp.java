package org.jeecg.modules.formmeta.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FormSchemaVersionResp", description = "Form schema version response")
public class FormSchemaVersionResp {
    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("version")
    private Integer version;

    @ApiModelProperty("status")
    private Integer status;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("created time")
    private Date createdTime;
}
