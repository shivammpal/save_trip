# File: app/routers/expenses.py

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from uuid import UUID

from app.models.user import UserInDB
from app.models.activity import Expense, ExpenseCreate
from app.core.dependencies import get_current_user
from app.core.database import trips_collection
from app.core.websockets import connection_manager

router = APIRouter(
    prefix="/trips/{trip_id}/expenses",
    tags=["Expenses"]
)

# Helper function to get a trip and verify ownership
async def _get_trip_and_verify_owner(trip_id: str, current_user: UserInDB):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})
    if trip is None or trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.post("/", response_model=Expense, status_code=status.HTTP_201_CREATED)
async def add_expense(
    trip_id: str,
    expense: ExpenseCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Adds a new expense to a trip and updates the trip's total spent."""
    await _get_trip_and_verify_owner(trip_id, current_user)

    new_expense = Expense(**expense.model_dump())

    # Atomically add the new expense and increment the total_spent field
    await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {
            "$push": {"expenses": new_expense.model_dump()},
            "$inc": {"total_spent": new_expense.amount}
        }
    )
    await connection_manager.broadcast(f'{{"event": "update", "source": "expenses"}}', trip_id)

    return new_expense

@router.put("/{expense_id}", response_model=Expense)
async def update_expense(
    trip_id: str,
    expense_id: UUID,
    expense_update: ExpenseCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Updates an expense and adjusts the trip's total spent."""
    trip = await _get_trip_and_verify_owner(trip_id, current_user)

    # Find the original expense to calculate the difference in amount
    original_expense = next((exp for exp in trip.get("expenses", []) if exp["id"] == expense_id), None)
    if not original_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    amount_difference = expense_update.amount - original_expense["amount"]
    updated_expense = Expense(**expense_update.model_dump(), id=expense_id)

    # Atomically update the expense item and adjust the total_spent
    await trips_collection.update_one(
        {"_id": ObjectId(trip_id), "expenses.id": expense_id},
        {
            "$set": {"expenses.$": updated_expense.model_dump()},
            "$inc": {"total_spent": amount_difference}
        }
    )
    await connection_manager.broadcast(f'{{"event": "update", "source": "expenses"}}', trip_id)

    return updated_expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    trip_id: str,
    expense_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    """Deletes an expense and adjusts the trip's total spent."""
    trip = await _get_trip_and_verify_owner(trip_id, current_user)

    # Find the expense to get its amount before deleting
    expense_to_delete = next((exp for exp in trip.get("expenses", []) if exp["id"] == expense_id), None)
    if not expense_to_delete:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Atomically remove the expense and decrement the total_spent
    await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {
            "$pull": {"expenses": {"id": expense_id}},
            "$inc": {"total_spent": -expense_to_delete["amount"]}
        }
    )
    await connection_manager.broadcast(f'{{"event": "update", "source": "expenses"}}', trip_id)
    return None