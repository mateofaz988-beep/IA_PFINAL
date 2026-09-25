from pydantic import BaseModel, ConfigDict


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, hide_input_in_errors=True)


class OutputModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Message(OutputModel):
    message: str
