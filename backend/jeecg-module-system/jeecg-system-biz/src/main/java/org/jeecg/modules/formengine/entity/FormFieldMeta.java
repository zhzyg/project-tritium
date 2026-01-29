package org.jeecg.modules.formengine.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

@Data
@TableName("form_field_meta")
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@ApiModel(value = "form_field_meta", description = "Form field metadata")
public class FormFieldMeta {
    @TableId(type = IdType.INPUT)
    @ApiModelProperty("id")
    private String id;

    @ApiModelProperty("form key")
    private String formKey;

    @TableField("schema_version")
    @ApiModelProperty("schema version")
    private Integer schemaVersion;

    @TableField("field_key")
    @ApiModelProperty("field key")
    private String fieldKey;

    @ApiModelProperty("label")
    private String label;

    @TableField("widget_type")
    @ApiModelProperty("widget type")
    private String widgetType;

    @TableField("db_column")
    @ApiModelProperty("db column")
    private String dbColumn;

    @TableField("db_type")
    @ApiModelProperty("db type")
    private String dbType;

    @TableField("db_length")
    @ApiModelProperty("db length")
    private Integer dbLength;

    @ApiModelProperty("nullable")
    private Integer nullable;

    @TableField("default_value")
    @ApiModelProperty("default value")
    private String defaultValue;

    @ApiModelProperty("searchable")
    private Integer searchable;

    @ApiModelProperty("status")
    private Integer status;

    @TableField("created_time")
    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("created time")
    private Date createdTime;
}
