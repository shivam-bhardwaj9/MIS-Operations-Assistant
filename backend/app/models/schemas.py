from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ColumnMappingModel(BaseModel):
    date: str = ""
    transactionId: str = ""
    customerName: str = ""
    type: str = ""
    amount: str = ""
    mode: str = ""
    status: str = ""
    remarks: str = ""


class ValidateRequest(BaseModel):
    sessionId: str
    columnMapping: ColumnMappingModel
    rawRecords: Optional[List[Dict[str, Any]]] = None
    fileName: Optional[str] = "Uploaded_Dataset.xlsx"
    fileSize: Optional[int] = 0


class CleanRequest(BaseModel):
    sessionId: str
    columnMapping: Optional[ColumnMappingModel] = None
    rawRecords: Optional[List[Dict[str, Any]]] = None
    fileName: Optional[str] = "Cleaned_Dataset.xlsx"
    fileSize: Optional[int] = 0
    applyCleaning: bool = True


class ReconcileMappingModel(BaseModel):
    transactionId: str
    date: str
    amount: str
    partyName: Optional[str] = ""


class ReconcileRequest(BaseModel):
    sessionId: str = "default"
    internalRecords: List[Dict[str, Any]] = Field(default_factory=list)
    externalRecords: List[Dict[str, Any]] = Field(default_factory=list)
    internalMapping: Optional[ReconcileMappingModel] = None
    externalMapping: Optional[ReconcileMappingModel] = None
    verifyDate: bool = True
    internalFileName: str = "Internal_Transactions.xlsx"
    externalFileName: str = "Bank_Statement.xlsx"
    useSampleReconciliation: bool = False
