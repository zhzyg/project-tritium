package org.jeecg.modules.formruntime.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormRecordMutationOptions", description = "Form runtime mutation options")
public class FormRecordMutationOptions {
    @ApiModelProperty("strict validation (default true)")
    private Boolean strict;
}
